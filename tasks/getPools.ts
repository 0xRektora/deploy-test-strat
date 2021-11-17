import { HardhatRuntimeEnvironment } from "hardhat/types";

export const getPools = async (taskArgs: { address: string }, hre: HardhatRuntimeEnvironment) => {
    await hre.run('compile')
    await hre.run('deploy')

    const pools = await (await hre.ethers.getContractAt("GetPools", (await hre.deployments.get('GetPools')).address)).getPools(taskArgs.address)
    console.log(pools.map(e => ({
        id: e.id.toString(),
        lpPair: e.lpPair,
        lpToken: e.lpToken,
        allocPoint: e.allocPoint.toString(),
        token0: { name: e.token0.name, tAddress: e.token0.tAddress },
        token1: { name: e.token1.name, tAddress: e.token1.tAddress }
    })));

    return pools

}