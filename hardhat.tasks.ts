import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers"


import { vaultTests } from "./tasks/vaultTests";
import { string } from "hardhat/internal/core/params/argumentTypes";
import { deployVault } from "./tasks/deployVault";
import { getPools } from "./tasks/getPools";


task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

task("deploy-vault", deployVault).addFlag("noCompile", "If used, will not trigger a smart contract compilation")
task("get-pools", getPools).addParam("address", "The masterchef address", undefined, string, false)
task("vault-test", vaultTests).addParam("address", "The deployed vault address", undefined, string, false)

