import { HardhatRuntimeEnvironment } from "hardhat/types";
import { VaultBase__factory } from "../typechain";

const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function compile() {
    const { stdout, stderr } = await exec('npx hardhat compile');
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
}

async function verifyStrat(stratAddress: string) {
    const { stdout, stderr } = await exec(`npx hardhat verify --network mainnet ${stratAddress}`);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
}

async function verifyVault(vaultAddress: string, stratAddress: string) {
    const { stdout, stderr } = await exec(`npx hardhat verify --network mainnet ${vaultAddress} "${stratAddress}"`);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
}

export const deployVault = async (taskArgs: { address: string, noCompile: boolean }, hre: HardhatRuntimeEnvironment) => {

    if (!taskArgs.noCompile) {
        // Compile
        await compile();
    }

    console.log(`Deploying on ChainId ${process.env.CHAIN_ID}`);


    // Deploy strat
    const strategyFactory = await hre.ethers.getContractFactory('StrategyTwoAssets')
    console.log(`Gas price: ${hre.ethers.utils.formatUnits(await hre.ethers.provider.getGasPrice(), 'gwei')} gwei`);

    const strategy = await (await strategyFactory.deploy())
    await strategy.deployTransaction.wait()
    console.log(`Deployed strategy at ${strategy.address}`);
    // const strategy = strategyFactory.attach("0x77F5095054087cb0a2196Ef6e572890c74b78332")

    // Deploy vault
    const vaultFactory: VaultBase__factory = await hre.ethers.getContractFactory('VaultBase')
    const vault = await vaultFactory.deploy(strategy.address)

    await vault.deployTransaction.wait()
    console.log(`Vault deployed at ${vault.address}`);

    // Set Jar address of strat to the deployed vault
    (await strategy.setJar(vault.address)).wait()
    console.log(`Strategy Jar address set to vault address at ${vault.address}`);

    // Verify contracts 
    if (Number(hre.network.config.chainId) === Number(process.env.CHAIN_ID)) {
        await verifyStrat(strategy.address)
        await verifyVault(vault.address, strategy.address)
    }

    // Run the tests
    await hre.run("vault_test", { address: vault.address })


}