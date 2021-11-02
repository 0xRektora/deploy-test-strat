import { HardhatRuntimeEnvironment } from "hardhat/types";
import { VaultBase__factory } from "../typechain";

export const deployVault = async (taskArgs: { address: string, noCompile: boolean }, hre: HardhatRuntimeEnvironment) => {

    if (!taskArgs.noCompile) {
        // Compile
        await hre.run('compile');
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
    if (Number(hre.network.config.chainId) === Number(process.env.CHAIN_ID) && Number(hre.network.config.chainId) !== 1285) {
        await hre.run('verify', { network: 'mainnet', address: strategy.address })
        await hre.run('verify', { network: 'mainnet', address: vault.address, constructorArgsParams: [strategy.address] })
    }

    // Run the tests
    await hre.run("vault-test", { address: vault.address })


}