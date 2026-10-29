# Deployment and Verification Guide

## Network verification status (checked 28 October 2026)

| Field | Testnet | Mainnet |
|---|---|---|
| Chain ID | `91562037` | `4646` |
| RPC in buildathon guide | `https://testnetrpc.mstblockchain.com` | `https://major.rpc.mstblockchain.com` |
| Explorer | `https://testnet.mstscan.com` | `https://mstscan.com` |
| Verification outcome | Chain ID/RPC/explorer corroborated by Chainlist and MST ecosystem documentation; the explorer has a Testnet retirement notice | Chain ID and explorer corroborated by a public network registry; the provided `major.rpc.mstblockchain.com` endpoint was not verified in accessible official developer documentation; a public Chainlist entry currently lists the different hostname `https://mariorpc.mstblockchain.com`, which must also be confirmed by MST before use |
| Use | **Confirm target with organizer first** | **Do not deploy until official RPC and production authorization are confirmed** |

Sources checked:

- MST Testnet chain registry: <https://chainid.network/chain/91562037/>
- MST ecosystem/Testnet guide: <https://rapiddex.io/docs/guides/getting-started.html>
- MST Testnet explorer and its deprecation notice: <https://testnet.mstscan.com/>
- MST Mainnet network reference (chain ID 4646, explorer, third-party RPC): <https://thirdweb.com/mst>
- MST Mainnet Chainlist entry (currently lists `https://mariorpc.mstblockchain.com`; not an official confirmation of the buildathon-supplied `major.rpc...` URL): <https://chainid.network/chain/4646/>
- MST official website: <https://mstblockchain.com/>

The public Testnet explorer currently says the MST Chain Testnet will be shut down after **31 January 2027** and to migrate to MST Coral Testnet. That means the values in the original buildathon guide may refer to a legacy Testnet. Obtain the official Coral Testnet chain ID, RPC, and explorer from the organizer/MST documentation; do not guess them.

## Local validation from a clean clone

```bash
npm install
npm run compile
npm test
npm run export:abi
```

Never use the `.env.example` directly for deployment. Create a private `.env` ignored by Git and use a dedicated deployment wallet. Never paste a private key into an issue, PR, chat, deployment record, or source file.

## Testnet deployment (only after target confirmation)

1. Confirm with the buildathon organizer that legacy MST Testnet is still the required target despite the explorer notice.
2. Copy `.env.example` to `.env`; fill `PRIVATE_KEY` and `MST_TESTNET_RPC_URL` locally. After the organizer explicitly confirms that legacy MST Testnet is the required target, set `MST_TESTNET_TARGET_CONFIRMED=I_CONFIRMED_LEGACY_MST_TESTNET`. Fund the wallet with testnet gas token through the faucet or the approved process.
3. Run compile and all tests; review the exact source commit and ensure the interface coordination checklist is complete.
4. Query the RPC chain ID independently and confirm `91562037` before signing any deployment transaction.
5. Run:

```bash
npm run deploy:testnet
npm run verify:testnet
```

6. Inspect the logged transaction hash and contract address in the explorer. Confirm bytecode at the expected address and successful source verification. If explorer API verification is unsupported or fails, follow the explorer's actual source-verification workflow and update the JSON record only with verified facts.
7. Commit the real `deployments/mstTestnet.json` record and ABI/network config changes through a reviewed PR. Do not publish test wallet private keys.

The deploy script blocks a wrong chain ID, a missing signer, and overwriting a previous deployment record by default.

## Mainnet deployment (strictly gated)

Mainnet deployment must wait until written production authorization, authorized deployer, funds, network endpoint confirmation, security review, and final interface approval are in place.

1. Obtain the current Mainnet RPC URL directly from official MST developer documentation or MST support. Do not infer it from a third-party chain list. Put it into `MST_MAINNET_RPC_URL` in the local `.env`.
2. Configure `PRIVATE_KEY` for the approved deployer. Set `EXPECTED_MAINNET_DEPLOYER_ADDRESS` to the exact authorized address and `MAINNET_MIN_BALANCE_MSTC` to the amount approved by the team after checking estimated gas.
3. Set `MAINNET_APPROVAL_REFERENCE` to the approved change/ticket reference. Only after formal authorization, set `MAINNET_DEPLOYMENT_AUTHORIZATION=I_AUTHORIZE_MST_MAINNET_DEPLOYMENT`.
4. Confirm RPC chain ID returns `4646`; re-run tests; inspect all source changes. A Mainnet transaction is an irreversible public operation.
5. Run:

```bash
npm run deploy:mainnet
npm run verify:mainnet
```

6. Independently confirm the contract address, transaction hash, block, deployer and bytecode on `https://mstscan.com`. Update verification status to success only if the explorer confirms the source/bytecode match.
7. Commit the actual `deployments/mstMainnet.json` in a reviewed PR. Keep internal approval tickets and authorization correspondence in the organization's approved private system; they are not copied into the public deployment record.

The script requires the authorization flag, approval reference, deployer allowlist, configured minimum balance, private key, chain match, and no prior deployment record (unless overwrite is explicitly allowed). These are guardrails, not a substitute for organizational authorization.

## Record format

The `deployments/*.json` files are deployment ledgers. They must contain real `contractAddress`, `deploymentTransactionHash`, `blockNumber`, `deployer`, `deployedAt`, explorer URLs and `verificationStatus`. Before deployment they correctly contain `NOT_DEPLOYED` and null address/hash fields. Never populate those fields with examples, fabricated hashes, or predicted addresses.
