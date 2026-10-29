require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const TESTNET_CHAIN_ID = 91562037;
const MAINNET_CHAIN_ID = 4646;
const privateKey = process.env.PRIVATE_KEY;
const accounts = privateKey && privateKey.trim() ? [privateKey.trim()] : [];
const mainnetRpc = (process.env.MST_MAINNET_RPC_URL || "").trim();

const networks = {
  mstTestnet: {
    url: (process.env.MST_TESTNET_RPC_URL || "https://testnetrpc.mstblockchain.com").trim(),
    chainId: TESTNET_CHAIN_ID,
    accounts
  }
};

// Mainnet is intentionally unavailable until the team configures an RPC endpoint
// confirmed through official MST developer support/documentation.
if (mainnetRpc) {
  networks.mstMainnet = {
    url: mainnetRpc,
    chainId: MAINNET_CHAIN_ID,
    accounts
  };
}

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun"
    }
  },
  networks,
  etherscan: {
    apiKey: {
      mstTestnet: process.env.MSTSCAN_API_KEY || "optional-blockscout-key",
      mstMainnet: process.env.MSTSCAN_API_KEY || "optional-blockscout-key"
    },
    customChains: [
      {
        network: "mstTestnet",
        chainId: TESTNET_CHAIN_ID,
        urls: {
          apiURL: "https://testnet.mstscan.com/api",
          browserURL: "https://testnet.mstscan.com"
        }
      },
      {
        network: "mstMainnet",
        chainId: MAINNET_CHAIN_ID,
        urls: {
          apiURL: "https://mstscan.com/api",
          browserURL: "https://mstscan.com"
        }
      }
    ]
  },
  mocha: { timeout: 60000 }
};
