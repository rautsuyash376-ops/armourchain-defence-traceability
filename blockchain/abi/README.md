# ABI status

`DefenceEquipmentTraceability.abi.json` is a **draft ABI assembled from the proposed Solidity interface** because the build workspace could not reach the npm registry and therefore could not run solc/Hardhat. It must not be treated as compiler-verified. Once dependency access is available, run:

```bash
npm install
npm run compile
npm run export:abi
```

Review the generated file diff with the frontend/backend owners before integration or deployment. Never deploy the contract until compilation and tests pass in the team environment.
