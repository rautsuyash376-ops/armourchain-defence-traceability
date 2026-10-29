# Smart Contract Handoff

**Release state:** proposed v0.1; not yet interface-frozen; not independently audited; no actual Testnet/Mainnet deployment from this workspace.

## Contract and ABI

- Contract: `DefenceEquipmentTraceability`
- Source: `contracts/DefenceEquipmentTraceability.sol`
- ABI: `abi/DefenceEquipmentTraceability.abi.json` (regenerate after source changes using `npm run export:abi`)
- Solidity: `0.8.24`, optimizer enabled with 200 runs, EVM Cancun
- Tooling: Hardhat 2, ethers 6 through Hardhat Toolbox, OpenZeppelin Contracts 5.0.2
- ID convention: opaque random `bytes32`; do not derive from serial or sensitive operational data.

## Role permissions

| Role | Permissions |
|---|---|
| `DEFAULT_ADMIN_ROLE` (administrator) | Grant/revoke role membership through AccessControl; pause/unpause; retire assets. Does not automatically receive business-action roles. The initial deployer receives this role. |
| `SUPPLIER_ROLE` | Register assets and register document hashes. |
| `DEPOT_OFFICER_ROLE` | Approve/reject custody transfers; approve/reject maintenance records and inspection records (subject to separation-of-duties); update non-retired asset status; register document hashes. |
| `LOGISTICS_OFFICER_ROLE` | Initiate custody transfers; register document hashes. Current custodian confirmation is still required for logistics-initiated transfers. |
| `MAINTENANCE_ENGINEER_ROLE` | Submit maintenance records; submit inspection records; register document hashes. |
| `AUDITOR_ROLE` | Record audit trail entries; register document hashes. Auditor role does not grant approval rights for maintenance/inspection in this proposal. |
| Current custodian address | May initiate a custody transfer directly or confirm a transfer initiated by Logistics. |

## Function and event detail

The canonical parameter order and event fields are listed in `API_CONTRACT.md`. The primary event timeline is built from `AssetRegistered`, the `CustodyTransfer*` lifecycle events, `MaintenanceRecord*`, `InspectionRecord*`, `DocumentHashRegistered`, `AssetStatusChanged`, and `AuditRecorded`. Index inherited `RoleGranted`, `RoleRevoked`, `RoleAdminChanged`, `Paused`, and `Unpaused` events for access-control and emergency state.

All event timestamps are Unix seconds. Event IDs are `bytes32`. Indexers must be idempotent using `(chainId, transactionHash, logIndex)` and sort using block number, transaction index, and log index. No location or full-document content belongs in the event payload.

## Deployment record status

| Network | Chain ID | Contract address | Deployment tx hash | Explorer verification |
|---|---:|---|---|---|
| MST Testnet (legacy target; confirm retirement plan) | `91562037` | **Not deployed** | **Not deployed** | Not attempted |
| MST Mainnet | `4646` | **Not deployed** | **Not deployed** | Not attempted |

The exact values are recorded in `deployments/mstTestnet.json`, `deployments/mstMainnet.json`, and `config/networks.json`. These files intentionally do not invent an address or transaction hash.

## Network and release checklist

- [ ] Frontend and backend owners approve the API contract and ABI.
- [ ] MST organizer confirms legacy Testnet vs Coral Testnet target.
- [ ] Official Mainnet RPC endpoint confirmed and tested for chain ID 4646.
- [ ] All tests pass; source review and independent security review completed.
- [ ] Testnet deployment and source verification completed; record values checked in explorer.
- [ ] Mainnet authorization, funding, approved deployer and deployment change record confirmed.
- [ ] PR opened from `feature/defence-equipment-traceability`; interface changes announced to frontend/backend; reviewers assigned.
