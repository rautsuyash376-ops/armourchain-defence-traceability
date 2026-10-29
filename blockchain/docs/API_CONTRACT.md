# Frontend/Backend Interface Contract — Proposal v0.1

**State: NOT YET APPROVED BY THE FRONTEND/BACKEND TEAM.** This document is the coordination artifact to review before ABI freeze. It does not claim that other developers were contacted or agreed.

## Proposed conventions

- Solidity compiler: `0.8.24`; contract: `DefenceEquipmentTraceability`.
- All application identifiers are opaque `bytes32` values. Generate random 32-byte identifiers off-chain. Never derive them from serial numbers, unit/site names, operational location, secret identifiers, or low-entropy values.
- Hash algorithm for documents: Keccak-256 of the exact file bytes, with a 32-byte result (`0x` plus 64 hex digits). Store the file only in approved off-chain storage. Do not silently transform, normalize, compress, or re-encode the file before hashing.
- Optional hash values: where an event/function permits a document or evidence hash to be omitted, use `bytes32(0)`; required hashes reject zero.
- Timestamps: Unix seconds (`uint64`). Use chain `block.timestamp` for recorded/approved events. Caller-supplied performed/inspection time must not be in the future.
- Event timeline ordering: canonical block number, transaction index, then log index. Use transaction hash and log index as the idempotency key; handle reorganizations according to the chosen RPC's guarantees.
- All event fields are public. Indexed fields can be filtered by indexers; indexed values are not secret.

## Proposed public function interface

| Function | Role / access | Parameters (in order) | Behavior |
|---|---|---|---|
| `registerAsset` | Supplier | `bytes32 assetId, bytes32 parentAssetId, AssetType assetType, bytes32 assetClassCodeHash, bytes32 metadataHash, address initialCustodian` | Register equipment/spare part; metadata is committed by hash, not stored as plaintext. `parentAssetId=0x00…00` means no parent. |
| `getAsset` | Public view | `bytes32 assetId` | Read asset struct; reverts if absent. |
| `assetExists` | Public view | `bytes32 assetId` | Check asset existence. |
| `requestCustodyTransfer` | Current custodian or Logistics Officer | `bytes32 assetId, bytes32 transferId, address toCustodian, bytes32 referenceHash, bytes32 documentHash` | Creates pending transfer. If the current custodian initiates, that action satisfies the custodian-confirmation step. |
| `confirmCustodyTransfer` | Current custodian | `bytes32 transferId` | Required when a Logistics Officer initiates the transfer. |
| `approveCustodyTransfer` | Depot Officer | `bytes32 transferId` | Requires custodian confirmation and separation of duties; updates current custodian. |
| `rejectCustodyTransfer` | Depot Officer (not requester/from custodian) | `bytes32 transferId, bytes32 reasonHash` | Rejects pending transfer. Hash the rejection explanation off-chain. |
| `cancelCustodyTransfer` | Requester or current custodian | `bytes32 transferId` | Cancels a pending transfer. |
| `getCustodyTransfer` | Public view | `bytes32 transferId` | Returns request and approval status. |
| `recordMaintenance` | Maintenance Engineer | `bytes32 assetId, bytes32 recordId, uint64 performedAt, bytes32 outcomeCodeHash, bytes32 recordHash, bytes32 documentHash` | Submits a maintenance record pending Depot Officer approval. |
| `approveMaintenanceRecord` | Depot Officer other than recorder | `bytes32 recordId` | Approves submitted maintenance record. |
| `rejectMaintenanceRecord` | Depot Officer other than recorder | `bytes32 recordId, bytes32 reasonHash` | Rejects submitted maintenance record. |
| `getMaintenanceRecord` | Public view | `bytes32 recordId` | Returns maintenance record and status. |
| `recordInspection` | Maintenance Engineer or Depot Officer | `bytes32 assetId, bytes32 inspectionId, uint64 inspectedAt, InspectionOutcome outcome, bytes32 reportHash, bytes32 documentHash` | Submits an inspection record pending Depot Officer approval. |
| `approveInspectionRecord` | Depot Officer other than recorder | `bytes32 inspectionId` | Approves inspection submission. |
| `rejectInspectionRecord` | Depot Officer other than recorder | `bytes32 inspectionId, bytes32 reasonHash` | Rejects inspection submission. |
| `getInspectionRecord` | Public view | `bytes32 inspectionId` | Returns inspection record and status. |
| `registerDocumentHash` | Supplier, Depot Officer, Logistics Officer, Maintenance Engineer, Auditor | `bytes32 assetId, bytes32 documentId, bytes32 contentHash, bytes32 documentTypeHash` | Registers immutable content hash; each version needs a new document ID. |
| `getDocumentProof` | Public view | `bytes32 documentId` | Returns registered hash and metadata. |
| `verifyDocumentHash` | Public view | `bytes32 documentId, bytes32 candidateContentHash` | Returns `true` if supplied content hash equals registered hash. |
| `recordAudit` | Auditor | `bytes32 assetId, bytes32 auditId, AuditOutcome outcome, bytes32 findingsHash, bytes32 evidenceHash` | Adds an immutable audit entry. |
| `getAuditRecord` | Public view | `bytes32 auditId` | Returns recorded audit entry. |
| `updateAssetStatus` | Depot Officer for Active/UnderMaintenance; Admin for Retired | `bytes32 assetId, AssetStatus newStatus, bytes32 reasonHash` | Updates status. Retired assets cannot be reactivated in this implementation. |
| `pause` / `unpause` | Administrator | no parameters | Emergency stop for state-changing workflows. |

Role assignment/revocation uses OpenZeppelin `grantRole(bytes32,address)` / `revokeRole(bytes32,address)` and is restricted to the default admin role.

## Enum numeric values

- `AssetType`: `Equipment=0`, `SparePart=1`.
- `AssetStatus`: `Active=0`, `UnderMaintenance=1`, `Retired=2`.
- `ApprovalStatus`: `Pending=0`, `Approved=1`, `Rejected=2`, `Cancelled=3`.
- `InspectionOutcome`: `Pass=0`, `Fail=1`, `Conditional=2`.
- `AuditOutcome`: `NoFinding=0`, `Finding=1`, `CriticalFinding=2`.

## Event schema (proposed)

| Event | Parameters in order | Timeline meaning |
|---|---|---|
| `AssetRegistered` | `assetId indexed, parentAssetId indexed, assetType, registeredBy indexed, initialCustodian, assetClassCodeHash, metadataHash, timestamp` | First registration. |
| `CustodyTransferRequested` | `assetId indexed, transferId indexed, fromCustodian indexed, toCustodian, requestedBy, referenceHash, documentHash, custodianConfirmed, timestamp` | Transfer requested. |
| `CustodyTransferConfirmed` | `assetId indexed, transferId indexed, confirmedBy indexed, timestamp` | Existing custodian explicitly confirmed a Logistics Officer request. |
| `CustodyTransferApproved` | `assetId indexed, transferId indexed, approvedBy indexed, fromCustodian, toCustodian, referenceHash, documentHash, timestamp` | Transfer approved and current custodian changed. |
| `CustodyTransferRejected` | `assetId indexed, transferId indexed, rejectedBy indexed, reasonHash, timestamp` | Transfer rejected. |
| `CustodyTransferCancelled` | `assetId indexed, transferId indexed, cancelledBy indexed, timestamp` | Pending transfer cancelled. |
| `MaintenanceRecordSubmitted` | `assetId indexed, recordId indexed, recordedBy indexed, performedAt, outcomeCodeHash, recordHash, documentHash, timestamp` | Maintenance record submitted. |
| `MaintenanceRecordApproved` | `assetId indexed, recordId indexed, approvedBy indexed, recordHash, documentHash, timestamp` | Maintenance record approved. |
| `MaintenanceRecordRejected` | `assetId indexed, recordId indexed, rejectedBy indexed, reasonHash, timestamp` | Maintenance record rejected. |
| `InspectionRecordSubmitted` | `assetId indexed, inspectionId indexed, recordedBy indexed, inspectedAt, outcome, reportHash, documentHash, timestamp` | Inspection submitted. |
| `InspectionRecordApproved` | `assetId indexed, inspectionId indexed, approvedBy indexed, outcome, reportHash, documentHash, timestamp` | Inspection approved. |
| `InspectionRecordRejected` | `assetId indexed, inspectionId indexed, rejectedBy indexed, reasonHash, timestamp` | Inspection rejected. |
| `DocumentHashRegistered` | `assetId indexed, documentId indexed, contentHash indexed, documentTypeHash, registeredBy, timestamp` | Document integrity proof registered. |
| `AssetStatusChanged` | `assetId indexed, previousStatus, newStatus, changedBy indexed, reasonHash, timestamp` | Asset lifecycle status changed. |
| `AuditRecorded` | `assetId indexed, auditId indexed, auditor indexed, outcome, findingsHash, evidenceHash, timestamp` | Audit record added. |

Inherited OpenZeppelin events `RoleGranted`, `RoleRevoked`, `RoleAdminChanged`, `Paused`, and `Unpaused` should also be indexed where relevant.

## Mandatory coordination checklist before freezing ABI

- [ ] Frontend owner confirms `bytes32` ID representation and how UI obtains opaque IDs.
- [ ] Backend/indexer owner confirms event names, field ordering, indexed fields, timestamp units, replay/idempotency keys, and reorg policy.
- [ ] Product/security owner confirms role assignment workflow, two-person approvals, and whether approval roles need any changes.
- [ ] MST buildathon organizer confirms target network and Testnet/Coral migration path.
- [ ] Repository owner agrees interface is frozen; record approver names/date in the PR.
- [ ] Any later interface changes are announced to frontend/backend before merge, and the ABI is regenerated in the same PR.

## Compatibility note

This is a v0.1 proposal. Any signature, enum ordinal, event name/argument/indexing change, or role hash change is an integration-breaking change and requires explicit team review. Never assume the ABI is finalized until the checklist is complete.
