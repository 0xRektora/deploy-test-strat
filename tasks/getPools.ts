import { HardhatRuntimeEnvironment } from "hardhat/types";

export const getPools = async (taskArgs: { address: string }, hre: HardhatRuntimeEnvironment) => {
    await hre.run('compile')

    const masterChefFactory = await hre.ethers.getContractFactory('MasterChefUtil')
    const lpPairfactory = await hre.ethers.getContractFactory('LiquidityPair')
    const erc20factory = await hre.ethers.getContractFactory('ERC20')
    const masterChef = masterChefFactory.attach(taskArgs.address)

    const poolsLength = await masterChef.poolLength()

    for (let i = 0; i < poolsLength.toNumber(); i++) {
        const poolInfo = await masterChef.poolInfo(i)
        const pair = lpPairfactory.attach(poolInfo.lpToken)
        const token0 = erc20factory.attach(await pair.token0())
        const token0name = await token0.name()
        const token1 = erc20factory.attach(await pair.token1())
        const token1name = await token1.name()
        const data = {
            id: i,
            lpPair: `${token0name}-${token1name}`,
            lpToken: poolInfo.lpToken,
            allocPoint: poolInfo.allocPoint.toNumber(),
            token0: `${token0name} : ${token0.address}`,
            token1: `${token1name} : ${token1.address}`
        }
        console.log(data);

    }

}