const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");
require("dotenv").config();

const NETWORKS = {
  mstTestnet: {
    chainId: 91562037,
    explorerUrl: "https://testnet.mstscan.com"
  },
  mstMainnet: {
    chainId: 4646,
    explorerUrl: "https://mstscan.com"
  }
};

function requireValue(name) {
  const value = (process.env[name] || "").trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function main() {
  const networkName = hre.network.name;
  const config = NETWORKS[networkName];
  if (!config) throw new Error(`Unsupported deployment network: ${networkName}`);

  if (networkName === "mstTestnet" && process.env.MST_TESTNET_TARGET_CONFIRMED !== "I_CONFIRMED_LEGACY_MST_TESTNET") {
    throw new Error("Testnet target guard: confirm with the buildathon organizer that legacy MST Testnet is still the required target, then set MST_TESTNET_TARGET_CONFIRMED=I_CONFIRMED_LEGACY_MST_TESTNET.");
  }

  const expectedChainId = config.chainId;
  const network = await hre.ethers.provider.getNetwork();
  const actualChainId = Number(network.chainId);
  if (actualChainId !== expectedChainId) {
    throw new Error(`Wrong chain ID for ${networkName}: expected ${expectedChainId}, got ${actualChainId}`);
  }

  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No deployer signer configured. Set PRIVATE_KEY in your local .env file; never commit it.");
  }
  const deployer = signers[0];
  const deployerAddress = await deployer.getAddress();
  const balance = await hre.ethers.provider.getBalance(deployerAddress);

  if (networkName === "mstMainnet") {
    if (requireValue("MAINNET_DEPLOYMENT_AUTHORIZATION") !== "I_AUTHORIZE_MST_MAINNET_DEPLOYMENT") {
      throw new Error("Mainnet guard: set MAINNET_DEPLOYMENT_AUTHORIZATION=I_AUTHORIZE_MST_MAINNET_DEPLOYMENT only after written production approval.");
    }
    requireValue("MAINNET_APPROVAL_REFERENCE");
    const expectedDeployer = requireValue("EXPECTED_MAINNET_DEPLOYER_ADDRESS");
    if (expectedDeployer.toLowerCase() !== deployerAddress.toLowerCase()) {
      throw new Error(`Configured authorized deployer ${expectedDeployer} does not match signer ${deployerAddress}`);
    }
    const minimumBalance = hre.ethers.parseEther(requireValue("MAINNET_MIN_BALANCE_MSTC"));
    if (balance < minimumBalance) {
      throw new Error(`Mainnet signer balance ${hre.ethers.formatEther(balance)} MSTC is below configured minimum ${hre.ethers.formatEther(minimumBalance)} MSTC`);
    }
    console.warn("MAINNET DEPLOYMENT AUTHORIZED. Confirm that this is the approved source revision and target address before proceeding.");
  }

  const recordPath = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  const existing = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  if (existing.status === "DEPLOYED" && process.env.ALLOW_DEPLOYMENT_RECORD_OVERWRITE !== "true") {
    throw new Error(`Deployment record already contains a deployment: ${recordPath}. Set ALLOW_DEPLOYMENT_RECORD_OVERWRITE=true only if a replacement deployment is intentional.`);
  }

  console.log(`Network: ${networkName} (chain ${actualChainId})`);
  console.log(`Deployer: ${deployerAddress}`);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} native token units`);

  const Factory = await hre.ethers.getContractFactory("DefenceEquipmentTraceability", deployer);
  const contract = await Factory.deploy();
  const deploymentTx = contract.deploymentTransaction();
  if (!deploymentTx) throw new Error("Unable to obtain deployment transaction.");
  console.log(`Deployment transaction submitted: ${deploymentTx.hash}`);

  const receipt = await deploymentTx.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Deployment transaction did not succeed.");
  const address = await contract.getAddress();
  const record = {
    status: "DEPLOYED",
    network: networkName,
    chainId: actualChainId,
    contractName: "DefenceEquipmentTraceability",
    contractAddress: address,
    deploymentTransactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    deployer: deployerAddress,
    deployedAt: new Date().toISOString(),
    explorerAddressUrl: `${config.explorerUrl}/address/${address}`,
    explorerTransactionUrl: `${config.explorerUrl}/tx/${receipt.hash}`,
    verificationStatus: "PENDING",
    sourceRevision: process.env.GIT_COMMIT_SHA || "NOT_RECORDED",
    mainnetAuthorizationGatePassed: networkName === "mstMainnet"
  };
  fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, { flag: "w" });
  console.log("Deployment confirmed and recorded:");
  console.log(JSON.stringify(record, null, 2));
  console.log("Next: run the matching verify script, check explorer bytecode/source, and commit the real deployment record after review.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
