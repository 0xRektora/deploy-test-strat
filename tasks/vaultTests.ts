import { BigNumber } from "@ethersproject/bignumber";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// KogeKoge Jar vault 0x992Ae1912CE6b608E0c0d2BF66259ab1aE62A657
// KogeKoge Strategy 0x587a50436b97F2278AbC01E00180539EE98fe415
export const vaultTests = async (taskArgs: { address: string }, hre: HardhatRuntimeEnvironment) => {
    const vaultAddress = taskArgs?.address
    const wallet = (await hre.ethers.getSigners())[0]

    if (!vaultAddress) {
        return "No address used"
    }

    // Loading vault
    const vaultBaseFactory = await hre.ethers.getContractFactory('VaultBase')
    const vault = vaultBaseFactory.attach(vaultAddress)

    // Loading vault LP
    const erc20TokenBaseFactory = await hre.ethers.getContractFactory('ERC20')
    const erc20Token = erc20TokenBaseFactory.attach(await vault.token())


    // Loading LP infos
    const erc20Name = await erc20Token.name()
    const erc20Decimals = await erc20Token.decimals()
    const walletLps = (await erc20Token.balanceOf(wallet.address));

    // Loading strategy
    const strategyAddress = await vault.strategy()
    const strategyFactory = await hre.ethers.getContractFactory('StrategyTwoAssets')
    const strategy = strategyFactory.attach(strategyAddress)

    // Loading reward token 
    const rewardToken = erc20TokenBaseFactory.attach(await strategy.rewardTokenAddr())

    if (walletLps.toString() === "0") {
        console.log(`No ${erc20Name} LP found, task stopping.`);
        return;
    }
    else {
        console.log(`You have ${walletLps} ${erc20Name} available`);
    }

    // Approve allowance
    const vaultAllowance = await erc20Token.allowance(wallet.address, vault.address)
    if (vaultAllowance.lt(walletLps)) {
        await (await erc20Token.approve(vault.address, hre.ethers.constants.MaxUint256)).wait()
    }

    // Deposit test
    console.log('Testing deposit');

    const sharesBeforeDeposit = await vault.balanceOf(wallet.address)
    console.log('depositing');

    await (await vault.deposit(walletLps)).wait()
    console.log('deposited');

    const shareAfterDeposit = await vault.balanceOf(wallet.address)
    const sharesDiff = shareAfterDeposit.sub(sharesBeforeDeposit)

    console.log(`Balance of before deposit: ${sharesBeforeDeposit}`);
    console.log(`Balance of after deposit:  ${shareAfterDeposit}`);
    console.log(`Deposited: ${walletLps} ${erc20Name}, in shares:${sharesDiff}`);

    let harvestCutoff: BigNumber
    try {
        harvestCutoff = await strategy.harvestCutoffBps()
    } catch (err) {
        console.log("Error while callin strategy.harvestCutoffBps(), falling back to strategy.harvestCutoff()");
        const iface = new hre.ethers.utils.Interface(["function harvestCutoff() view returns (uint256)"])
        const result = await wallet.call({
            to: strategy.address,
            data: iface.getSighash('harvestCutoff')
        })
        harvestCutoff = iface.decodeFunctionResult('harvestCutoff', result)[0]
    }
    console.log(`Harvest cutoff for ${await rewardToken.name()} ${harvestCutoff.toString()}`);

    const amountToSend = harvestCutoff
    // const amountToSend = hre.ethers.utils.parseEther("1.1")

    // Send reward token to strat
    console.log(`Sending ${hre.ethers.utils.formatUnits(amountToSend, "ether")} to the strategy`);

    await (await rewardToken.transfer(strategy.address, amountToSend)).wait()

    // Harvest
    await (await strategy.harvest()).wait()
    const lpsAfterHarvest = (await vault.balanceOf(wallet.address))
    const ratio = hre.ethers.utils.formatUnits((await vault.getRatio()).toString(), 'wei')
    if (lpsAfterHarvest.mul(ratio).lte(shareAfterDeposit)) {
        throw new Error("Harvesting didn't augment the user LPs")

    } else {
        console.log("Harvest function working");
    }

    // withdraw
    console.log('Withdrawing');
    await (await vault.withdraw(sharesDiff)).wait()

    const balanceAfterWithdraw = await erc20Token.balanceOf(wallet.address)

    if ((balanceAfterWithdraw).lt(walletLps)) {
        throw new Error("The amount withdrawn is less than the amount deposited")
    } else {
        console.log("Withdraw function working");
    }

    console.log(`Current LPs amount: ${(balanceAfterWithdraw)}`);


    // Emergency Withdraw gas estimation
    const emergencyWithrawGasEst = await strategy.estimateGas.emergencyWithdraw()
    console.log(`Emergency withdraw gas est ${emergencyWithrawGasEst}`);

    console.log(`Tests over`);
}