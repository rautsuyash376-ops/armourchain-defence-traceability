# ArmourChain — Defence Equipment Traceability dApp frontend

A React + TypeScript prototype frontend for equipment registration, supplier certificate proofs, custody transfers, maintenance events, approvals, and auditable lifecycle history. The UI uses a dark enterprise visual system with restrained violet/cyan accents and motion. All included equipment records are fictional demo records.

## Safety and integration boundaries

- This repository is **frontend only**. It does not modify or implement a smart contract, backend, database, or authorization system.
- No classified, operational, personnel, or location-sensitive data should be entered. Demo equipment identifiers and supplier names are fictional.
- Full documents stay off-chain. The UI shows proof type, safe metadata, and a verification hash only.
- Mock data is used only when `VITE_ENABLE_MOCK_DATA=true`. It is visibly labeled as demo data. The current screens do not silently fall back to mock data when that flag is off.
- No private key, seed phrase, or wallet secret is requested or stored. Wallet connection uses the browser wallet's `eth_requestAccounts` method only; no transaction signing is wired in this prototype.
- Role switching is a UI preview only. Actual access control must be enforced server-side and/or by the contract.
- API endpoint paths in `src/lib/api.ts` are provisional examples. Agree on request/response types and endpoint names with the backend teammate before enabling API calls.
- MST Testnet RPC, chain ID, explorer URL, contract address, ABI, function names, and event names are intentionally not assumed. Confirm all values with the contract teammate before final integration. MSTScan links appear only when an explorer URL is configured and a transaction is confirmed.

## Requirements

- Node.js 20+ recommended
- npm
- Git

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, if `cp` is unavailable:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Vite prints a local URL, usually `http://localhost:5173`.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_ENABLE_MOCK_DATA` | For demo only | Set to `true` to enable the clearly labeled local demo data. Set to `false` for integration work. |
| `VITE_API_BASE_URL` | For API integration | Base URL for the backend API, e.g. `http://localhost:8080/api`. |
| `VITE_CHAIN_ID` | After teammate confirmation | Numeric EVM chain ID for MST Testnet. |
| `VITE_CHAIN_NAME` | Optional | Human-readable network name; defaults to `MST Testnet`. |
| `VITE_RPC_URL` | After teammate confirmation | MST Testnet RPC URL. Do not put private credentials here. Remember Vite `VITE_*` values are public in the client bundle. |
| `VITE_EXPLORER_URL` | After teammate confirmation | MSTScan base URL, without a trailing slash. |
| `VITE_CONTRACT_ADDRESS` | After teammate confirmation | Deployed prototype contract address. |

Never commit `.env`, `.env.local`, private keys, seed phrases, or real sensitive documents. Browser-exposed `VITE_*` variables must never contain secrets.

## Frontend integration contract

1. **Backend teammate:** agree on DTOs and endpoints before wiring `src/lib/api.ts`. Shared frontend interfaces live in `src/types/index.ts`. API paths are provisional and must not be treated as a finalized backend contract.
2. **Contract teammate:** confirm MST Testnet RPC, chain ID, explorer base URL, contract address, ABI, function names, event names, and confirmation policy. Then add a dedicated wallet/contract integration module without changing backend or contract files.
3. **Wallet signing:** users connect their own wallet and sign transactions directly in the wallet. Never ask for or persist a private key. Implement and display the lifecycle: wallet approval → submitted → confirmed/failed. A transaction is confirmed only after a successful receipt is checked on the expected chain.
4. **Explorer links:** construct transaction links from the confirmed MSTScan base URL only after a confirmed receipt exists. Do not label a local mock transaction as chain-confirmed.
5. **Indexed API:** use the API/PostgreSQL read model for searchable asset lists, dashboards, and event history. Show index freshness and chain-confirmation state when returned by the API; distinguish indexed state from on-chain receipt state.
6. **Documents:** only send document hashes and approved safe metadata to the chain. Keep full documents in the approved off-chain document store.
7. **Roles:** this frontend's role selector is a preview. Enforce authorization in trusted backend/contract logic and derive the actual connected role from the approved identity/authorization mechanism.

## Suggested team workflow (four people)

- Create one feature branch per contributor from the agreed base branch; keep changes scoped to frontend files.
- Assign ownership before edits: UI shell/design system; registry/detail/timeline; forms/approvals; API/wallet integration and tests.
- Put shared DTOs in `src/types/index.ts` and agree on changes in a short PR before multiple branches depend on them.
- Rebase/merge through GitHub pull requests. Review endpoint/type changes with the backend teammate and contract configuration with the contract teammate before integration.
- Use focused commits such as `feat(ui): add asset registry`, `feat(ui): add event timeline`, `docs: document frontend setup`.
- This generated package does not create a Git branch, commit, or pull request because no repository URL or GitHub write connection was provided. Copy it into the shared repository on a feature branch and open a PR there.

## Scripts

```bash
npm run dev       # development server
npm run typecheck # TypeScript project check
npm run build     # production build
npm run preview   # preview production build
```

## Current prototype coverage

- Dashboard: asset summary cards, activity visualization, integrity summary, recent assets, pending actions.
- Registry: searchable/filterable equipment list and asset detail.
- Asset detail: current custodian, status, proof hash metadata, chronological event timeline, transaction detail modal.
- Registration form: local demo-only asset creation; full document upload intentionally disabled.
- Record event form: delivery, inspection, custody transfer, maintenance, and audit review demo events.
- Approval queue: pending/approved/rejected local demo states.
- Transaction log: lifecycle states, confirmation count, and conditional explorer link.
- Responsive sidebar and layouts, reduced-motion preference support, and safe-data reminders.

## Before production or a live demo

Run `npm run typecheck` and `npm run build`. Then integrate only against the agreed API and contract interface. Add tests for API error/empty states, wallet rejection, wrong chain, reverted transactions, receipt confirmation, explorer links, authorization, and role-specific UI. Do not represent mock values or frontend-only decisions as authoritative records.
