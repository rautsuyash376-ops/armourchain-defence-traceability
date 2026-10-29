const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const networkName = hre.network.name;
  const expectedChainId = networkName === "mstTestnet" ? 91562037 : networkName === "mstMainnet" ? 4646 : null;
  if (!expectedChainId) throw new Error(`Unsupported verification network: ${networkName}`);
  const actualChainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  if (actualChainId !== expectedChainId) throw new Error(`Wrong chain ID: expected ${expectedChainId}, got ${actualChainId}`);

  const recordPath = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  if (record.status !== "DEPLOYED" || !record.contractAddress || !record.deploymentTransactionHash) {
    throw new Error(`No genuine deployment record found for ${networkName}; deploy first and do not add placeholder addresses or hashes.`);
  }

  try {
    await hre.run("verify:verify", {
      address: record.contractAddress,
      constructorArguments: []
    });
    record.verificationStatus = "VERIFIED";
    record.verificationCheckedAt = new Date().toISOString();
    record.verificationError = null;
    fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`Explorer source verification succeeded for ${record.contractAddress}`);
  } catch (error) {
    record.verificationStatus = "FAILED_OR_UNSUPPORTED_BY_EXPLORER";
    record.verificationCheckedAt = new Date().toISOString();
    // Keep raw explorer/API error text in local console output only; it could contain
    // URLs or details that should not be copied into a tracked deployment record.
    record.verificationError = "Verification failed or explorer API was unsupported; inspect local logs and the explorer.";
    fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    console.error("Explorer source verification did not succeed. Deployment remains on-chain; use the explorer's supported manual verification flow and update the record after checking it.");
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
