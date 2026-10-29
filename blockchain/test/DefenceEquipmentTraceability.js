const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DefenceEquipmentTraceability", function () {
  let contract;
  let admin, supplier, depot, logistics, engineer, auditor, currentCustodian, nextCustodian, outsider;

  const h = (text) => ethers.keccak256(ethers.toUtf8Bytes(text));
  const assetId = h("test-asset-A");
  const transferId = h("transfer-A");

 async function registerAsset() {
  return await contract.connect(supplier).registerAsset(
    assetId,
    ethers.ZeroHash,
    0,
    h("asset-class"),
    h("asset-metadata"),
    currentCustodian.address
  );
}

  beforeEach(async function () {
    [admin, supplier, depot, logistics, engineer, auditor, currentCustodian, nextCustodian, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DefenceEquipmentTraceability");
    contract = await Factory.deploy();
    await contract.waitForDeployment();

    await contract.connect(admin).grantRole(await contract.SUPPLIER_ROLE(), supplier.address);
    await contract.connect(admin).grantRole(await contract.DEPOT_OFFICER_ROLE(), depot.address);
    await contract.connect(admin).grantRole(await contract.LOGISTICS_OFFICER_ROLE(), logistics.address);
    await contract.connect(admin).grantRole(await contract.MAINTENANCE_ENGINEER_ROLE(), engineer.address);
    await contract.connect(admin).grantRole(await contract.AUDITOR_ROLE(), auditor.address);
  });

  it("registers equipment and emits an indexable event", async function () {
    await expect(registerAsset()).to.emit(contract, "AssetRegistered");
    const asset = await contract.getAsset(assetId);
    expect(asset.exists).to.equal(true);
    expect(asset.currentCustodian).to.equal(currentCustodian.address);
    expect(asset.status).to.equal(0n);
  });

  it("enforces supplier-only registration", async function () {
    await expect(contract.connect(outsider).registerAsset(
      assetId, ethers.ZeroHash, 0, h("class"), h("metadata"), currentCustodian.address
    )).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
  });

  it("requires custodian confirmation and depot approval for logistics-requested transfers", async function () {
    await registerAsset();
    await contract.connect(logistics).requestCustodyTransfer(assetId, transferId, nextCustodian.address, h("ref"), h("doc"));
    await expect(contract.connect(depot).approveCustodyTransfer(transferId))
      .to.be.revertedWithCustomError(contract, "CustodianConfirmationRequired");
    await contract.connect(currentCustodian).confirmCustodyTransfer(transferId);
    await expect(contract.connect(depot).approveCustodyTransfer(transferId))
      .to.emit(contract, "CustodyTransferApproved");
    expect((await contract.getAsset(assetId)).currentCustodian).to.equal(nextCustodian.address);
    expect((await contract.getCustodyTransfer(transferId)).status).to.equal(1n);
  });

  it("prevents a transfer requester from approving their own request", async function () {
    await registerAsset();
    await contract.connect(currentCustodian).requestCustodyTransfer(assetId, transferId, nextCustodian.address, h("ref"), h("doc"));
    // A requester must be a depot officer to exercise this test path; assign both roles deliberately.
    await contract.connect(admin).grantRole(await contract.DEPOT_OFFICER_ROLE(), currentCustodian.address);
    await expect(contract.connect(currentCustodian).approveCustodyTransfer(transferId))
      .to.be.revertedWithCustomError(contract, "SeparationOfDuties");
  });

  it("requires a different depot officer to approve a maintenance record", async function () {
    await registerAsset();
    const recordId = h("maintenance-A");
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await expect(contract.connect(engineer).recordMaintenance(assetId, recordId, now, h("OK"), h("record"), h("doc")))
      .to.emit(contract, "MaintenanceRecordSubmitted");
    await expect(contract.connect(engineer).approveMaintenanceRecord(recordId))
      .to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    await contract.connect(depot).approveMaintenanceRecord(recordId);
    expect((await contract.getMaintenanceRecord(recordId)).status).to.equal(1n);
  });

  it("records inspections and enforces a separate approval action", async function () {
    await registerAsset();
    const inspectionId = h("inspection-A");
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await expect(contract.connect(engineer).recordInspection(
      assetId, inspectionId, now, 1, h("inspection-report"), h("inspection-doc")
    )).to.emit(contract, "InspectionRecordSubmitted");
    await contract.connect(depot).approveInspectionRecord(inspectionId);
    const record = await contract.getInspectionRecord(inspectionId);
    expect(record.outcome).to.equal(1n);
    expect(record.status).to.equal(1n);
  });

  it("pauses state-changing workflows when the administrator pauses", async function () {
    await contract.connect(admin).pause();
    await expect(registerAsset()).to.be.revertedWithCustomError(contract, "EnforcedPause");
    await contract.connect(admin).unpause();
    await expect(registerAsset()).to.emit(contract, "AssetRegistered");
  });

  it("stores document hashes and verifies candidate hashes", async function () {
    await registerAsset();
    const documentId = h("document-A");
    const contentHash = h("actual-document-content");
    await expect(contract.connect(supplier).registerDocumentHash(assetId, documentId, contentHash, h("maintenance-report")))
      .to.emit(contract, "DocumentHashRegistered");
    expect(await contract.verifyDocumentHash(documentId, contentHash)).to.equal(true);
    expect(await contract.verifyDocumentHash(documentId, h("tampered-content"))).to.equal(false);
  });

  it("allows auditors to record audit outcomes but not suppliers or outsiders", async function () {
    await registerAsset();
    const auditId = h("audit-A");
    await expect(contract.connect(outsider).recordAudit(assetId, auditId, 0, h("findings"), h("evidence")))
      .to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    await expect(contract.connect(auditor).recordAudit(assetId, auditId, 1, h("findings"), h("evidence")))
      .to.emit(contract, "AuditRecorded");
    expect((await contract.getAuditRecord(auditId)).outcome).to.equal(1n);
  });

  it("allows only an administrator to retire an asset", async function () {
    await registerAsset();
    await expect(contract.connect(depot).updateAssetStatus(assetId, 2, h("retirement")))
      .to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    await contract.connect(admin).updateAssetStatus(assetId, 2, h("retirement"));
    expect((await contract.getAsset(assetId)).status).to.equal(2n);
    await expect(contract.connect(admin).updateAssetStatus(assetId, 0, h("reactivate")))
      .to.be.revertedWithCustomError(contract, "AssetAlreadyRetired");
  });
});
