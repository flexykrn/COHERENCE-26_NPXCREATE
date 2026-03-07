require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../../.env" });

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "0".repeat(64);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    hoodi: {
      url: "https://ethereum-hoodi-rpc.publicnode.com",
      chainId: 560048,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  etherscan: {
    apiKey: {
      hoodi: "no-api-key-needed",
    },
    customChains: [
      {
        network: "hoodi",
        chainId: 560048,
        urls: {
          apiURL: "https://hoodi.ethpandaops.io/api",
          browserURL: "https://hoodi.ethpandaops.io",
        },
      },
    ],
  },
};
