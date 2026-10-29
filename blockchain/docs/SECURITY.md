# Security and Data Handling

## Data classification

This public-chain contract is **not suitable for classified information**. Never put these on-chain or into public PRs/logs: document bodies; photos or attachments; serial numbers if sensitive; exact base, depot, unit, convoy, route, or operational coordinates; personnel names/IDs; schedules; detailed repair narratives; vulnerability details; credentials; or secret reference identifiers. Use approved private storage and access controls off-chain. Even a hash can leak equality and can be brute-forced if it is derived from guessable inputs.

## Hash convention

For document integrity, compute `keccak256(fileBytes)` from the exact original bytes. Record the 32-byte hash on-chain; store the full file and any mapping from document ID to operational records in a suitably protected off-chain system. The contract's verification view compares the candidate hash to the registered hash. It does not retrieve the file or attest that the original file is accurate.

## Roles and operational controls

- Assign role wallets only after identity verification through the organization's own process.
- Use separate, dedicated Testnet and Mainnet wallets and least-privilege role separation; do not reuse a Testnet key on Mainnet or share a private key across people.
- Treat custodian wallet addresses and the relationships between assets and those addresses as public operational metadata; use approved institutional custodial wallets only after an operational security review.
- Keep the administrator key separate from supplier, depot, logistics, maintenance, and auditor accounts.
- Use a second person to approve transfers, maintenance, and inspections; the contract rejects self-approval in these workflows.
- The admin can pause state-changing operations if incident response requires it. Pausing is public and does not undo past transactions.
- Role revocation prevents future role-gated actions but cannot erase historical events.

## Release status

This is a hackathon/prototype implementation. Unit tests do not replace an independent security audit, threat model, operational security assessment, legal review, load/gas evaluation, and validation against MST's deployed EVM fork/explorer behavior. Do not deploy with real defence logistics or use classified operational workflows without formal review and authorization.
