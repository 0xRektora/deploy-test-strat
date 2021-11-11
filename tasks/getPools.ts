import { HardhatRuntimeEnvironment } from "hardhat/types";

export const getPools = async (taskArgs: { address: string }, hre: HardhatRuntimeEnvironment) => {
    await hre.run('compile')
    await hre.run('deploy')

    const pools = await (await hre.ethers.getContractAt("GetPools", (await hre.deployments.get('GetPools')).address)).getPools(taskArgs.address)
    console.log(pools);

    return pools

}