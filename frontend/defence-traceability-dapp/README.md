# ArmourChain frontend

React and TypeScript web app for the ArmourChain equipment traceability prototype.

The app uses the NestJS API for asset records, approvals, dashboard data, and saved transaction history. It connects to BridgeKey to submit equipment registration transactions on MST Testnet.

## Run locally

From this folder, install the packages:

```powershell
npm install
```

If this folder does not already have a local `.env` file, copy `.env.example` to `.env`. Set the API URL and MST Testnet configuration in `.env`, then start the frontend:

```powershell
npm run dev
```

Vite prints the local app address, usually `http://localhost:5173`.

## Build

```powershell
npm run build
```

This checks the TypeScript code and creates production files in `dist/`.

## API routes used

- `GET /api/dashboard/summary`
- `GET /api/assets`
- `GET /api/assets/:id`
- `GET /api/approvals`
- `GET /api/transactions`
- `POST /api/assets`
- `PATCH /api/approvals/:approvalCode`

Set `VITE_API_BASE_URL` to the backend API address.

## Wallet and Testnet

The frontend connects to the user's browser wallet and submits registration transactions to the configured MST Testnet contract. The chain ID, RPC URL, explorer URL, and contract address are configured with `VITE_*` environment variables.

All `VITE_*` values are included in the browser app and are public. Never put private keys, seed phrases, passwords, or other secrets in them.

## Safe use and limitations

- Use fictional demo records only. Do not enter classified details, real document contents, personnel data, or sensitive operational locations.
- The role selector is a UI preview; it does not authorize actions.
- The prototype API does not yet enforce production-grade authorization. Do not use it for real operational data or expose it as a production service.
- Keep full documents off-chain. Only approved hashes and safe metadata belong in traceability records.
- The frontend build may show a large-bundle warning; the build can still succeed.