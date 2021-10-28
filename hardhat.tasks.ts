import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers"


import { vaultTests } from "./tasks/vault_tests";
import { string } from "hardhat/internal/core/params/argumentTypes";
import { deployVault } from "./tasks/deploy_vault";
import { getPools } from "./tasks/get_pools";


task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

task("deploy_vault", deployVault).addFlag("nocompile", "If used, will not trigger a smart contract compilation")
task("get_pools", getPools).addParam("address", "The masterchef address", undefined, string, false)
task("vault_test", vaultTests).addParam("address", "The deployed vault address", undefined, string, false)

