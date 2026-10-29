const fs = require("node:fs");
const path = require("node:path");

const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "DefenceEquipmentTraceability.sol", "DefenceEquipmentTraceability.json");
const outputPath = path.join(__dirname, "..", "abi", "DefenceEquipmentTraceability.abi.json");
if (!fs.existsSync(artifactPath)) {
  throw new Error("Compiler artifact not found. Run npm run compile first.");
}
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
fs.writeFileSync(outputPath, `${JSON.stringify(artifact.abi, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
