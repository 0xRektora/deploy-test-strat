import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-etherscan";


import { vaultTests } from "./tasks/vault_tests";
import { boolean, string } from "hardhat/internal/core/params/argumentTypes";
import { deployVault } from "./tasks/deploy_vault";
import { getPools } from "./tasks/get_pools";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("deploy_vault", deployVault).addFlag("nocompile", "If used, will not trigger a smart contract compilation")
task("get_pools", getPools).addParam("address", "The masterchef address", undefined, string, false)
task("vault_test", vaultTests).addParam("address", "The deployed vault address", undefined, string, false)


// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: "0.6.12",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [{ privateKey: process.env.PRIVATE_KEY, balance: "100000000000000000000" }] : [],
      forking: {
        url: process.env.MAINNET || "",
      }
    },
    mainnet: {
      url: process.env.MAINNET || "",
      chainId: 250,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.BLOCKSCAN_KEY
  }
};

export default config;
