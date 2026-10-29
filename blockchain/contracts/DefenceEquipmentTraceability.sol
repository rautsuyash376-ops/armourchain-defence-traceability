// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title DefenceEquipmentTraceability
/// @notice Traceability metadata and integrity proofs only. Never store classified,
/// personal, operational-location, or full-document content on this public ledger.
/// @dev Proposed v0.1 interface. See docs/API_CONTRACT.md before integrating clients.
contract DefenceEquipmentTraceability is AccessControl, Pausable {
    bytes32 public constant SUPPLIER_ROLE = keccak256("SUPPLIER_ROLE");
    bytes32 public constant DEPOT_OFFICER_ROLE = keccak256("DEPOT_OFFICER_ROLE");
    bytes32 public constant LOGISTICS_OFFICER_ROLE = keccak256("LOGISTICS_OFFICER_ROLE");
    bytes32 public constant MAINTENANCE_ENGINEER_ROLE = keccak256("MAINTENANCE_ENGINEER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    enum AssetType {
        Equipment,
        SparePart
    }

    enum AssetStatus {
        Active,
        UnderMaintenance,
        Retired
    }

    enum ApprovalStatus {
        Pending,
        Approved,
        Rejected,
        Cancelled
    }

    enum InspectionOutcome {
        Pass,
        Fail,
        Conditional
    }

    enum AuditOutcome {
        NoFinding,
        Finding,
        CriticalFinding
    }

    struct Asset {
        bytes32 parentAssetId;
        AssetType assetType;
        AssetStatus status;
        bytes32 assetClassCodeHash;
        bytes32 metadataHash;
        address currentCustodian;
        uint64 registeredAt;
        uint64 updatedAt;
        bool exists;
    }

    struct CustodyTransfer {
        bytes32 assetId;
        address fromCustodian;
        address toCustodian;
        address requestedBy;
        bytes32 referenceHash;
        bytes32 documentHash;
        uint64 requestedAt;
        bool custodianConfirmed;
        ApprovalStatus status;
        bool exists;
    }

    struct MaintenanceRecord {
        bytes32 assetId;
        address recordedBy;
        uint64 performedAt;
        bytes32 outcomeCodeHash;
        bytes32 recordHash;
        bytes32 documentHash;
        uint64 recordedAt;
        ApprovalStatus status;
        bool exists;
    }

    struct InspectionRecord {
        bytes32 assetId;
        address recordedBy;
        uint64 inspectedAt;
        InspectionOutcome outcome;
        bytes32 reportHash;
        bytes32 documentHash;
        uint64 recordedAt;
        ApprovalStatus status;
        bool exists;
    }

    struct AuditRecord {
        bytes32 assetId;
        address auditor;
        AuditOutcome outcome;
        bytes32 findingsHash;
        bytes32 evidenceHash;
        uint64 recordedAt;
        bool exists;
    }

    struct DocumentProof {
        bytes32 assetId;
        bytes32 contentHash;
        bytes32 documentTypeHash;
        address registeredBy;
        uint64 registeredAt;
        bool exists;
    }

    mapping(bytes32 assetId => Asset asset) private _assets;
    mapping(bytes32 transferId => CustodyTransfer transferRequest) private _transfers;
    mapping(bytes32 assetId => bytes32 transferId) private _pendingTransferByAsset;
    mapping(bytes32 recordId => MaintenanceRecord record) private _maintenanceRecords;
    mapping(bytes32 inspectionId => InspectionRecord record) private _inspectionRecords;
    mapping(bytes32 auditId => AuditRecord record) private _auditRecords;
    mapping(bytes32 documentId => DocumentProof proof) private _documentProofs;

    error ZeroIdentifier();
    error ZeroAddress();
    error ZeroHash();
    error AssetAlreadyExists(bytes32 assetId);
    error AssetNotFound(bytes32 assetId);
    error RecordAlreadyExists(bytes32 recordId);
    error RecordNotFound(bytes32 recordId);
    error DocumentAlreadyExists(bytes32 documentId);
    error DocumentNotFound(bytes32 documentId);
    error InvalidParentAsset(bytes32 parentAssetId);
    error TransferAlreadyPending(bytes32 assetId);
    error TransferNotPending(bytes32 transferId);
    error CustodianConfirmationRequired(bytes32 transferId);
    error AlreadyConfirmed(bytes32 transferId);
    error SameCustodian();
    error SeparationOfDuties();
    error InvalidTimestamp();
    error AssetAlreadyRetired(bytes32 assetId);
    error InvalidStatusTransition();
    error UnauthorizedDocumentRecorder();

    event AssetRegistered(
        bytes32 indexed assetId,
        bytes32 indexed parentAssetId,
        AssetType assetType,
        address indexed registeredBy,
        address initialCustodian,
        bytes32 assetClassCodeHash,
        bytes32 metadataHash,
        uint64 timestamp
    );

    event CustodyTransferRequested(
        bytes32 indexed assetId,
        bytes32 indexed transferId,
        address indexed fromCustodian,
        address toCustodian,
        address requestedBy,
        bytes32 referenceHash,
        bytes32 documentHash,
        bool custodianConfirmed,
        uint64 timestamp
    );
    event CustodyTransferConfirmed(
        bytes32 indexed assetId,
        bytes32 indexed transferId,
        address indexed confirmedBy,
        uint64 timestamp
    );
    event CustodyTransferApproved(
        bytes32 indexed assetId,
        bytes32 indexed transferId,
        address indexed approvedBy,
        address fromCustodian,
        address toCustodian,
        bytes32 referenceHash,
        bytes32 documentHash,
        uint64 timestamp
    );
    event CustodyTransferRejected(
        bytes32 indexed assetId,
        bytes32 indexed transferId,
        address indexed rejectedBy,
        bytes32 reasonHash,
        uint64 timestamp
    );
    event CustodyTransferCancelled(
        bytes32 indexed assetId,
        bytes32 indexed transferId,
        address indexed cancelledBy,
        uint64 timestamp
    );

    event MaintenanceRecordSubmitted(
        bytes32 indexed assetId,
        bytes32 indexed recordId,
        address indexed recordedBy,
        uint64 performedAt,
        bytes32 outcomeCodeHash,
        bytes32 recordHash,
        bytes32 documentHash,
        uint64 timestamp
    );
    event MaintenanceRecordApproved(
        bytes32 indexed assetId,
        bytes32 indexed recordId,
        address indexed approvedBy,
        bytes32 recordHash,
        bytes32 documentHash,
        uint64 timestamp
    );
    event MaintenanceRecordRejected(
        bytes32 indexed assetId,
        bytes32 indexed recordId,
        address indexed rejectedBy,
        bytes32 reasonHash,
        uint64 timestamp
    );

    event InspectionRecordSubmitted(
        bytes32 indexed assetId,
        bytes32 indexed inspectionId,
        address indexed recordedBy,
        uint64 inspectedAt,
        InspectionOutcome outcome,
        bytes32 reportHash,
        bytes32 documentHash,
        uint64 timestamp
    );
    event InspectionRecordApproved(
        bytes32 indexed assetId,
        bytes32 indexed inspectionId,
        address indexed approvedBy,
        InspectionOutcome outcome,
        bytes32 reportHash,
        bytes32 documentHash,
        uint64 timestamp
    );
    event InspectionRecordRejected(
        bytes32 indexed assetId,
        bytes32 indexed inspectionId,
        address indexed rejectedBy,
        bytes32 reasonHash,
        uint64 timestamp
    );

    event DocumentHashRegistered(
        bytes32 indexed assetId,
        bytes32 indexed documentId,
        bytes32 indexed contentHash,
        bytes32 documentTypeHash,
        address registeredBy,
        uint64 timestamp
    );
    event AssetStatusChanged(
        bytes32 indexed assetId,
        AssetStatus previousStatus,
        AssetStatus newStatus,
        address indexed changedBy,
        bytes32 reasonHash,
        uint64 timestamp
    );
    event AuditRecorded(
        bytes32 indexed assetId,
        bytes32 indexed auditId,
        address indexed auditor,
        AuditOutcome outcome,
        bytes32 findingsHash,
        bytes32 evidenceHash,
        uint64 timestamp
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ---- Asset registration and lookup ----

    function registerAsset(
        bytes32 assetId,
        bytes32 parentAssetId,
        AssetType assetType,
        bytes32 assetClassCodeHash,
        bytes32 metadataHash,
        address initialCustodian
    ) external onlyRole(SUPPLIER_ROLE) whenNotPaused {
        if (assetId == bytes32(0)) revert ZeroIdentifier();
        if (_assets[assetId].exists) revert AssetAlreadyExists(assetId);
        if (initialCustodian == address(0)) revert ZeroAddress();
        if (assetClassCodeHash == bytes32(0) || metadataHash == bytes32(0)) revert ZeroHash();
        if (parentAssetId != bytes32(0) && !_assets[parentAssetId].exists) {
            revert InvalidParentAsset(parentAssetId);
        }

        uint64 nowTs = uint64(block.timestamp);
        _assets[assetId] = Asset({
            parentAssetId: parentAssetId,
            assetType: assetType,
            status: AssetStatus.Active,
            assetClassCodeHash: assetClassCodeHash,
            metadataHash: metadataHash,
            currentCustodian: initialCustodian,
            registeredAt: nowTs,
            updatedAt: nowTs,
            exists: true
        });

        emit AssetRegistered(
            assetId,
            parentAssetId,
            assetType,
            msg.sender,
            initialCustodian,
            assetClassCodeHash,
            metadataHash,
            nowTs
        );
    }

    function getAsset(bytes32 assetId) external view returns (Asset memory) {
        return _requireAsset(assetId);
    }

    function assetExists(bytes32 assetId) external view returns (bool) {
        return _assets[assetId].exists;
    }

    function pendingTransferId(bytes32 assetId) external view returns (bytes32) {
        _requireAsset(assetId);
        return _pendingTransferByAsset[assetId];
    }

    // ---- Two-party custody transfer workflow ----

    function requestCustodyTransfer(
        bytes32 assetId,
        bytes32 transferId,
        address toCustodian,
        bytes32 referenceHash,
        bytes32 documentHash
    ) external whenNotPaused {
        Asset storage asset = _requireAsset(assetId);
        if (transferId == bytes32(0)) revert ZeroIdentifier();
        if (_transfers[transferId].exists) revert RecordAlreadyExists(transferId);
        if (toCustodian == address(0)) revert ZeroAddress();
        if (toCustodian == asset.currentCustodian) revert SameCustodian();
        if (_pendingTransferByAsset[assetId] != bytes32(0)) revert TransferAlreadyPending(assetId);
        if (msg.sender != asset.currentCustodian && !hasRole(LOGISTICS_OFFICER_ROLE, msg.sender)) {
            revert AccessControlUnauthorizedAccount(msg.sender, LOGISTICS_OFFICER_ROLE);
        }

        bool confirmedByCustodian = msg.sender == asset.currentCustodian;
        uint64 nowTs = uint64(block.timestamp);
        _transfers[transferId] = CustodyTransfer({
            assetId: assetId,
            fromCustodian: asset.currentCustodian,
            toCustodian: toCustodian,
            requestedBy: msg.sender,
            referenceHash: referenceHash,
            documentHash: documentHash,
            requestedAt: nowTs,
            custodianConfirmed: confirmedByCustodian,
            status: ApprovalStatus.Pending,
            exists: true
        });
        _pendingTransferByAsset[assetId] = transferId;

        emit CustodyTransferRequested(
            assetId,
            transferId,
            asset.currentCustodian,
            toCustodian,
            msg.sender,
            referenceHash,
            documentHash,
            confirmedByCustodian,
            nowTs
        );
    }

    function confirmCustodyTransfer(bytes32 transferId) external whenNotPaused {
        CustodyTransfer storage transferRequest = _requirePendingTransfer(transferId);
        if (msg.sender != transferRequest.fromCustodian) revert SeparationOfDuties();
        if (transferRequest.custodianConfirmed) revert AlreadyConfirmed(transferId);

        transferRequest.custodianConfirmed = true;
        emit CustodyTransferConfirmed(
            transferRequest.assetId,
            transferId,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    function approveCustodyTransfer(bytes32 transferId)
        external
        onlyRole(DEPOT_OFFICER_ROLE)
        whenNotPaused
    {
        CustodyTransfer storage transferRequest = _requirePendingTransfer(transferId);
        if (!transferRequest.custodianConfirmed) revert CustodianConfirmationRequired(transferId);
        if (msg.sender == transferRequest.requestedBy || msg.sender == transferRequest.fromCustodian || msg.sender == transferRequest.toCustodian) {
            revert SeparationOfDuties();
        }

        Asset storage asset = _requireAsset(transferRequest.assetId);
        address from = transferRequest.fromCustodian;
        address to = transferRequest.toCustodian;
        bytes32 assetId = transferRequest.assetId;
        uint64 nowTs = uint64(block.timestamp);

        asset.currentCustodian = to;
        asset.updatedAt = nowTs;
        transferRequest.status = ApprovalStatus.Approved;
        _pendingTransferByAsset[assetId] = bytes32(0);

        emit CustodyTransferApproved(
            assetId,
            transferId,
            msg.sender,
            from,
            to,
            transferRequest.referenceHash,
            transferRequest.documentHash,
            nowTs
        );
    }

    function rejectCustodyTransfer(bytes32 transferId, bytes32 reasonHash)
        external
        onlyRole(DEPOT_OFFICER_ROLE)
        whenNotPaused
    {
        CustodyTransfer storage transferRequest = _requirePendingTransfer(transferId);
        if (
            msg.sender == transferRequest.requestedBy
                || msg.sender == transferRequest.fromCustodian
                || msg.sender == transferRequest.toCustodian
        ) {
            revert SeparationOfDuties();
        }
        transferRequest.status = ApprovalStatus.Rejected;
        _pendingTransferByAsset[transferRequest.assetId] = bytes32(0);
        emit CustodyTransferRejected(
            transferRequest.assetId,
            transferId,
            msg.sender,
            reasonHash,
            uint64(block.timestamp)
        );
    }

    function cancelCustodyTransfer(bytes32 transferId) external whenNotPaused {
        CustodyTransfer storage transferRequest = _requirePendingTransfer(transferId);
        if (msg.sender != transferRequest.requestedBy && msg.sender != transferRequest.fromCustodian) {
            revert SeparationOfDuties();
        }
        transferRequest.status = ApprovalStatus.Cancelled;
        _pendingTransferByAsset[transferRequest.assetId] = bytes32(0);
        emit CustodyTransferCancelled(
            transferRequest.assetId,
            transferId,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    function getCustodyTransfer(bytes32 transferId) external view returns (CustodyTransfer memory) {
        CustodyTransfer memory item = _transfers[transferId];
        if (!item.exists) revert RecordNotFound(transferId);
        return item;
    }

    // ---- Maintenance records and approval ----

    function recordMaintenance(
        bytes32 assetId,
        bytes32 recordId,
        uint64 performedAt,
        bytes32 outcomeCodeHash,
        bytes32 recordHash,
        bytes32 documentHash
    ) external onlyRole(MAINTENANCE_ENGINEER_ROLE) whenNotPaused {
        _requireAsset(assetId);
        if (recordId == bytes32(0)) revert ZeroIdentifier();
        if (_maintenanceRecords[recordId].exists) revert RecordAlreadyExists(recordId);
        if (performedAt > block.timestamp) revert InvalidTimestamp();
        if (outcomeCodeHash == bytes32(0) || recordHash == bytes32(0)) revert ZeroHash();

        uint64 nowTs = uint64(block.timestamp);
        _maintenanceRecords[recordId] = MaintenanceRecord({
            assetId: assetId,
            recordedBy: msg.sender,
            performedAt: performedAt,
            outcomeCodeHash: outcomeCodeHash,
            recordHash: recordHash,
            documentHash: documentHash,
            recordedAt: nowTs,
            status: ApprovalStatus.Pending,
            exists: true
        });

        emit MaintenanceRecordSubmitted(
            assetId, recordId, msg.sender, performedAt, outcomeCodeHash, recordHash, documentHash, nowTs
        );
    }

    function approveMaintenanceRecord(bytes32 recordId)
        external
        onlyRole(DEPOT_OFFICER_ROLE)
        whenNotPaused
    {
        MaintenanceRecord storage record = _requirePendingMaintenance(recordId);
        if (msg.sender == record.recordedBy) revert SeparationOfDuties();
        record.status = ApprovalStatus.Approved;
        emit MaintenanceRecordApproved(
            record.assetId,
            recordId,
            msg.sender,
            record.recordHash,
            record.documentHash,
            uint64(block.timestamp)
        );
    }

    function rejectMaintenanceRecord(bytes32 recordId, bytes32 reasonHash)
        external
        onlyRole(DEPOT_OFFICER_ROLE)
        whenNotPaused
    {
        MaintenanceRecord storage record = _requirePendingMaintenance(recordId);
        if (msg.sender == record.recordedBy) revert SeparationOfDuties();
        record.status = ApprovalStatus.Rejected;
        emit MaintenanceRecordRejected(
            record.assetId, recordId, msg.sender, reasonHash, uint64(block.timestamp)
        );
    }

    function getMaintenanceRecord(bytes32 recordId) external view returns (MaintenanceRecord memory) {
        MaintenanceRecord memory item = _maintenanceRecords[recordId];
        if (!item.exists) revert RecordNotFound(recordId);
        return item;
    }

    // ---- Inspection records and approval ----

    function recordInspection(
        bytes32 assetId,
        bytes32 inspectionId,
        uint64 inspectedAt,
        InspectionOutcome outcome,
        bytes32 reportHash,
        bytes32 documentHash
    ) external whenNotPaused {
        if (!hasRole(MAINTENANCE_ENGINEER_ROLE, msg.sender) && !hasRole(DEPOT_OFFICER_ROLE, msg.sender)) {
            revert AccessControlUnauthorizedAccount(msg.sender, MAINTENANCE_ENGINEER_ROLE);
        }
        _requireAsset(assetId);
        if (inspectionId == bytes32(0)) revert ZeroIdentifier();
        if (_inspectionRecords[inspectionId].exists) revert RecordAlreadyExists(inspectionId);
        if (inspectedAt > block.timestamp) revert InvalidTimestamp();
        if (reportHash == bytes32(0)) revert ZeroHash();

        uint64 nowTs = uint64(block.timestamp);
        _inspectionRecords[inspectionId] = InspectionRecord({
            assetId: assetId,
            recordedBy: msg.sender,
            inspectedAt: inspectedAt,
            outcome: outcome,
            reportHash: reportHash,
            documentHash: documentHash,
            recordedAt: nowTs,
            status: ApprovalStatus.Pending,
            exists: true
        });

        emit InspectionRecordSubmitted(
            assetId, inspectionId, msg.sender, inspectedAt, outcome, reportHash, documentHash, nowTs
        );
    }

    function approveInspectionRecord(bytes32 inspectionId)
        external
        onlyRole(DEPOT_OFFICER_ROLE)
        whenNotPaused
    {
        InspectionRecord storage record = _requirePendingInspection(inspectionId);
        if (msg.sender == record.recordedBy) revert SeparationOfDuties();
        record.status = ApprovalStatus.Approved;
        emit InspectionRecordApproved(
            record.assetId,
            inspectionId,
            msg.sender,
            record.outcome,
            record.reportHash,
            record.documentHash,
            uint64(block.timestamp)
        );
    }

    function rejectInspectionRecord(bytes32 inspectionId, bytes32 reasonHash)
        external
        onlyRole(DEPOT_OFFICER_ROLE)
        whenNotPaused
    {
        InspectionRecord storage record = _requirePendingInspection(inspectionId);
        if (msg.sender == record.recordedBy) revert SeparationOfDuties();
        record.status = ApprovalStatus.Rejected;
        emit InspectionRecordRejected(
            record.assetId, inspectionId, msg.sender, reasonHash, uint64(block.timestamp)
        );
    }

    function getInspectionRecord(bytes32 inspectionId) external view returns (InspectionRecord memory) {
        InspectionRecord memory item = _inspectionRecords[inspectionId];
        if (!item.exists) revert RecordNotFound(inspectionId);
        return item;
    }

    // ---- Document integrity proofs ----

    /// @notice Registers a Keccak-256 content hash; the document bytes stay off-chain.
    function registerDocumentHash(
        bytes32 assetId,
        bytes32 documentId,
        bytes32 contentHash,
        bytes32 documentTypeHash
    ) external whenNotPaused {
        if (!_isDocumentRecorder(msg.sender)) revert UnauthorizedDocumentRecorder();
        _requireAsset(assetId);
        if (documentId == bytes32(0)) revert ZeroIdentifier();
        if (_documentProofs[documentId].exists) revert DocumentAlreadyExists(documentId);
        if (contentHash == bytes32(0) || documentTypeHash == bytes32(0)) revert ZeroHash();

        uint64 nowTs = uint64(block.timestamp);
        _documentProofs[documentId] = DocumentProof({
            assetId: assetId,
            contentHash: contentHash,
            documentTypeHash: documentTypeHash,
            registeredBy: msg.sender,
            registeredAt: nowTs,
            exists: true
        });
        emit DocumentHashRegistered(assetId, documentId, contentHash, documentTypeHash, msg.sender, nowTs);
    }

    function getDocumentProof(bytes32 documentId) external view returns (DocumentProof memory) {
        DocumentProof memory proof = _documentProofs[documentId];
        if (!proof.exists) revert DocumentNotFound(documentId);
        return proof;
    }

    function verifyDocumentHash(bytes32 documentId, bytes32 candidateContentHash) external view returns (bool) {
        DocumentProof memory proof = _documentProofs[documentId];
        if (!proof.exists) revert DocumentNotFound(documentId);
        return proof.contentHash == candidateContentHash;
    }

    // ---- Auditor trail and asset status ----

    function recordAudit(
        bytes32 assetId,
        bytes32 auditId,
        AuditOutcome outcome,
        bytes32 findingsHash,
        bytes32 evidenceHash
    ) external onlyRole(AUDITOR_ROLE) whenNotPaused {
        _requireAsset(assetId);
        if (auditId == bytes32(0)) revert ZeroIdentifier();
        if (_auditRecords[auditId].exists) revert RecordAlreadyExists(auditId);
        if (findingsHash == bytes32(0)) revert ZeroHash();

        uint64 nowTs = uint64(block.timestamp);
        _auditRecords[auditId] = AuditRecord({
            assetId: assetId,
            auditor: msg.sender,
            outcome: outcome,
            findingsHash: findingsHash,
            evidenceHash: evidenceHash,
            recordedAt: nowTs,
            exists: true
        });
        emit AuditRecorded(assetId, auditId, msg.sender, outcome, findingsHash, evidenceHash, nowTs);
    }

    function getAuditRecord(bytes32 auditId) external view returns (AuditRecord memory) {
        AuditRecord memory item = _auditRecords[auditId];
        if (!item.exists) revert RecordNotFound(auditId);
        return item;
    }

    function updateAssetStatus(bytes32 assetId, AssetStatus newStatus, bytes32 reasonHash)
        external
        whenNotPaused
    {
        Asset storage asset = _requireAsset(assetId);
        if (asset.status == AssetStatus.Retired) revert AssetAlreadyRetired(assetId);
        if (newStatus == asset.status) revert InvalidStatusTransition();

        if (newStatus == AssetStatus.Retired) {
            _checkRole(DEFAULT_ADMIN_ROLE, msg.sender);
        } else {
            _checkRole(DEPOT_OFFICER_ROLE, msg.sender);
        }

        AssetStatus previousStatus = asset.status;
        asset.status = newStatus;
        asset.updatedAt = uint64(block.timestamp);
        emit AssetStatusChanged(
            assetId, previousStatus, newStatus, msg.sender, reasonHash, uint64(block.timestamp)
        );
    }

    // ---- Emergency operations ----

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ---- Internal helpers ----

    function _requireAsset(bytes32 assetId) internal view returns (Asset storage asset) {
        asset = _assets[assetId];
        if (!asset.exists) revert AssetNotFound(assetId);
    }

    function _requirePendingTransfer(bytes32 transferId)
        internal
        view
        returns (CustodyTransfer storage transferRequest)
    {
        transferRequest = _transfers[transferId];
        if (!transferRequest.exists || transferRequest.status != ApprovalStatus.Pending) {
            revert TransferNotPending(transferId);
        }
    }

    function _requirePendingMaintenance(bytes32 recordId)
        internal
        view
        returns (MaintenanceRecord storage record)
    {
        record = _maintenanceRecords[recordId];
        if (!record.exists) revert RecordNotFound(recordId);
        if (record.status != ApprovalStatus.Pending) revert RecordNotFound(recordId);
    }

    function _requirePendingInspection(bytes32 inspectionId)
        internal
        view
        returns (InspectionRecord storage record)
    {
        record = _inspectionRecords[inspectionId];
        if (!record.exists) revert RecordNotFound(inspectionId);
        if (record.status != ApprovalStatus.Pending) revert RecordNotFound(inspectionId);
    }

    function _isDocumentRecorder(address account) internal view returns (bool) {
        return hasRole(SUPPLIER_ROLE, account)
            || hasRole(DEPOT_OFFICER_ROLE, account)
            || hasRole(LOGISTICS_OFFICER_ROLE, account)
            || hasRole(MAINTENANCE_ENGINEER_ROLE, account)
            || hasRole(AUDITOR_ROLE, account);
    }
}
