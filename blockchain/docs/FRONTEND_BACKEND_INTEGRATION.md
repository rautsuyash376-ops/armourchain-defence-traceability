# Frontend / Backend Integration Notes

1. Import ABI from `abi/DefenceEquipmentTraceability.abi.json`; use `config/networks.json` for the shared network settings, while respecting its pending-confirmation status fields.
2. Connect to the contract with an approved provider and wallet. Reads are public; writes require a wallet with the correct role or an explicitly authorized current custodian address.
3. Use opaque IDs as `bytes32` values. The sample `generate-asset-id.cjs` creates random IDs; map them to operational asset records only in the approved backend.
4. Generate document hashes using Keccak-256 over exact bytes. The frontend can show the hash and verification result, but must not upload sensitive full document contents to this contract.
5. For timeline entries, subscribe to contract events or backfill from a trusted RPC; normalize fields into the UI's timeline model. Use `blockNumber`, `transactionIndex`, and `logIndex` ordering. De-duplicate by `chainId + transactionHash + logIndex`; handle removed logs/reorgs. Reconcile important final state against view functions.
6. Treat contract event content as public. Do not put sensitive explanations in a `reasonHash` preimage stored elsewhere without corresponding access controls.
7. The current public ABI is proposed v0.1. Coordinate before changing role constants, function signatures, enums, event names/fields/indexing, or timestamp units. Regenerate ABI in the same reviewed change and notify both client teams before merge.
