require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "cancun" // Required for mcopy opcode used by OpenZeppelin 5.x
    }
  },
  networks: {
    // Local development
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    
    // Hoodi ETH Testnet (update with actual values)
    hoodiTestnet: {
      url: process.env.HOODI_RPC_URL || "https://rpc.testnet.hoodi.network",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.HOODI_CHAIN_ID || "42069"),
      gasPrice: "auto"
    },
    
    // Hoodi ETH Mainnet (update with actual values)
    hoodiMainnet: {
      url: process.env.HOODI_MAINNET_RPC_URL || "https://rpc.hoodi.network",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.HOODI_MAINNET_CHAIN_ID || "42070"),
      gasPrice: "auto"
    }
  },
  etherscan: {
    apiKey: {
      hoodiTestnet: process.env.HOODI_EXPLORER_API_KEY || "dummy",
      hoodiMainnet: process.env.HOODI_EXPLORER_API_KEY || "dummy"
    },
    customChains: [
      {
        network: "hoodiTestnet",
        chainId: parseInt(process.env.HOODI_CHAIN_ID || "42069"),
        urls: {
          apiURL: process.env.HOODI_EXPLORER_API_URL || "https://explorer.testnet.hoodi.network/api",
          browserURL: process.env.HOODI_EXPLORER_URL || "https://explorer.testnet.hoodi.network"
        }
      },
      {
        network: "hoodiMainnet",
        chainId: parseInt(process.env.HOODI_MAINNET_CHAIN_ID || "42070"),
        urls: {
          apiURL: process.env.HOODI_MAINNET_EXPLORER_API_URL || "https://explorer.hoodi.network/api",
          browserURL: process.env.HOODI_MAINNET_EXPLORER_URL || "https://explorer.hoodi.network"
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
