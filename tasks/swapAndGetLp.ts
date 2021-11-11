import { BigNumber } from "@ethersproject/bignumber";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ERC20, Wrapped } from "../typechain";
import { getPools } from "./getPools";

const nullAddr = "0x0000000000000000000000000000000000000000"

const getNative = (chainId: number) => {
    if (chainId === 137) return { wrapped: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", usdcPool: "0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827" }
    if (chainId === 250) return { wrapped: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83", usdcPool: "0xe7E90f5a767406efF87Fdad7EB07ef407922EC1D" }
    if (chainId === 1285) return { wrapped: "0x98878B06940aE243284CA214f92Bb71a2b032B8A", usdcPool: "0xe537f70a8b62204832B8Ba91940B77d3f79AEb81" }
    else return { wrapped: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", usdcPool: "0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827" }
}

const getWrappedTokens = async (hre: HardhatRuntimeEnvironment, wrappedTk: Wrapped, swapAmount: BigNumber) => {
    console.log(`Wrapping ${hre.ethers.utils.formatEther(swapAmount)} ${await wrappedTk.name()}`);
    await (await wrappedTk.deposit({
        value: swapAmount
    })).wait()
}

export const swapAndGetLp = async (taskArgs: { masterchef: string, router: string, poolIds: string, swapAmount?: string }, hre: HardhatRuntimeEnvironment) => {
    await hre.run('compile')
    await hre.run('deploy')

    const { deployer } = await hre.getNamedAccounts()
    const swapAmount = hre.ethers.utils.parseEther(taskArgs.swapAmount ?? "0.1")
    const wrapped = getNative(Number(process.env.CHAIN_ID) ?? 0).wrapped

    const wrappedTk = await hre.ethers.getContractAt("Wrapped", wrapped)

    // We extract the tokens to get
    const poolIds = taskArgs.poolIds.split(',')
    const pools = (await getPools({ address: taskArgs.masterchef }, hre)).filter(e => poolIds.includes(e.id.toString()))
    const tokens = pools
        .map(p => [p.token0.tAddress, p.token1.tAddress])
        .flat()
        .map(p => p.toLowerCase() === wrapped.toLocaleLowerCase() ? p.toLowerCase() : p.toLowerCase())

    console.log(tokens.length);

    // We wrap the native token if not enough
    const totalSwapAmount = swapAmount.mul(tokens.length)
    if (totalSwapAmount !== await wrappedTk.balanceOf(deployer)) {
        await getWrappedTokens(hre, wrappedTk, totalSwapAmount)
    } else {
        console.log(`Using ${hre.ethers.utils.formatEther(await wrappedTk.balanceOf(deployer))}`);
    }

    const autoSwap = (await hre.ethers.getContractAt("AutoSwap", (await hre.deployments.get('AutoSwap')).address));
    await (await wrappedTk.approve(autoSwap.address, totalSwapAmount)).wait()
    const receipt = await (await autoSwap.swap(
        taskArgs.router,
        swapAmount,
        wrapped,
        tokens,
    )).wait();


    const swaps: { token: string, swapped: string, amountSwapped: BigNumber }[] = []
    receipt.events?.filter(e => e.event === "Swap").map(i => i.args?.tokens?.map((_j: any, idx: number) => {
        swaps.push({
            token: tokens[idx],
            swapped: i.args?.swapped?.[idx],
            amountSwapped: i.args?.amounts?.[idx]
        })
    }))

    console.log(swaps.map(e => ({ ...e, amountSwapped: hre.ethers.utils.formatEther(e.amountSwapped) })));


    await Promise.all(swaps.map(async (e) => {
        const token = await hre.ethers.getContractAt("ERC20", e.token)
        console.log(`${await token.name()} have ${hre.ethers.utils.formatUnits(await token.balanceOf(deployer), await token.decimals())}`);
    }));


    const router = await hre.ethers.getContractAt("IUniswapV2Router02", taskArgs.router)
    for await (const pool of pools) {
        // WMATIC SUPPORT
        const token0 = pool.token0.tAddress
        const token1 = pool.token1.tAddress
        const amount0 = token0 === wrappedTk.address
            ? swapAmount
            : swaps
                .find(e => (e.token.toLowerCase() === pool.token0.tAddress.toLowerCase()))
                ?.amountSwapped ?? 0
        const amount1 = token1 === wrappedTk.address
            ? swapAmount
            : swaps
                .find(e => (e.token.toLowerCase() === pool.token1.tAddress.toLowerCase()))
                ?.amountSwapped ?? 0
        console.log("Swapping", token0, token1);
        console.log("for", amount0, amount1);

        if (token0 === wrappedTk.address || token1 === wrappedTk.address) {
            console.log("need to swap");
            await getWrappedTokens(hre, wrappedTk, swapAmount)
        }
        await (await (await hre.ethers.getContractAt("ERC20", token0)).approve(router.address, amount0)).wait()
        await (await (await hre.ethers.getContractAt("ERC20", token1)).approve(router.address, amount1)).wait()
        await (await router.addLiquidity(
            token0,
            token1,
            amount0,
            amount1,
            0,
            0,
            deployer,
            Date.now(),
        )).wait()
    }

    for (const pool of pools) {
        const balance = hre.ethers.utils.formatEther(
            (await (await hre.ethers.getContractAt("ERC20", pool.lpToken)).balanceOf(deployer))
        )
        console.log(`Amount for ${pool.lpPair} ${balance}`);
    }

}