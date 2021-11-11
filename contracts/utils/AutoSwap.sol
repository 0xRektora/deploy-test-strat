// SPDX-License-Identifier: MIT
// @author 0xRektora

//_____/\\\\\\\_____________________/\\\\\\\\\___________________________________________________________________________________________
// ___/\\\/////\\\_________________/\\\///////\\\___________________/\\\__________________________________________________________________
//  __/\\\____\//\\\_______________\/\\\_____\/\\\__________________\/\\\_____________/\\\_________________________________________________
//   _\/\\\_____\/\\\__/\\\____/\\\_\/\\\\\\\\\\\/________/\\\\\\\\__\/\\\\\\\\_____/\\\\\\\\\\\_____/\\\\\_____/\\/\\\\\\\___/\\\\\\\\\____
//    _\/\\\_____\/\\\_\///\\\/\\\/__\/\\\//////\\\______/\\\/////\\\_\/\\\////\\\__\////\\\////____/\\\///\\\__\/\\\/////\\\_\////////\\\___
//     _\/\\\_____\/\\\___\///\\\/____\/\\\____\//\\\____/\\\\\\\\\\\__\/\\\\\\\\/______\/\\\_______/\\\__\//\\\_\/\\\___\///____/\\\\\\\\\\__
//      _\//\\\____/\\\_____/\\\/\\\___\/\\\_____\//\\\__\//\\///////___\/\\\///\\\______\/\\\_/\\__\//\\\__/\\\__\/\\\__________/\\\/////\\\__
//       __\///\\\\\\\/____/\\\/\///\\\_\/\\\______\//\\\__\//\\\\\\\\\\_\/\\\_\///\\\____\//\\\\\____\///\\\\\/___\/\\\_________\//\\\\\\\\/\\_
//        ____\///////_____\///____\///__\///________\///____\//////////__\///____\///______\/////_______\/////_____\///___________\////////\//__

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";
import "../interfaces/IUniswap.sol";

interface IMasterChefStruct {
    // Info of each pool.
    struct PoolInfo {
        address lpToken; // Address of LP token contract.
        uint256 allocPoint; // How many allocation points assigned to this pool. WASPs to distribute per block.
        uint256 lastRewardTimestamp; // Last block number that WASPs distribution occurs.
        uint256 accRewardPerShare; // Accumulated WASPs per share, times 1e12. See below.
    }
}

interface IMasterChef is IMasterChefStruct {
    function poolInfo(uint256 _poolId) external view returns (PoolInfo memory);

    function poolLength() external view returns (uint256);
}

interface IStructs {
    struct TokenInfo {
        string name;
        address tAddress;
    }
    // Info of each pool.
    struct FormattedPoolInfo {
        uint256 id;
        string lpPair; // The name of the pair
        address lpToken; // Address of LP token contract.
        uint256 allocPoint; // How many allocation points assigned to this pool. WASPs to distribute per block.
        TokenInfo token0;
        TokenInfo token1;
    }
}

interface IGetPools is IStructs {
    function getPools(address _masterchef)
        external
        view
        returns (FormattedPoolInfo[] memory);
}

contract AutoSwap is IMasterChefStruct {
    address public constant nullAddr =
        0x0000000000000000000000000000000000000000;

    // Get all the pairs from the factory
    function getAllPairs(IUniswapV2Factory _factory)
        internal
        view
        returns (IUniswapV2Pair[] memory allPairs)
    {
        uint256 allPairsLength = _factory.allPairsLength();
        allPairs = new IUniswapV2Pair[](allPairsLength);

        for (uint256 index = 0; index < allPairsLength; index++) {
            allPairs[index] = IUniswapV2Pair(_factory.allPairs(index));
        }
    }

    function getRoute(
        IUniswapV2Pair[] memory _allPairs,
        address _wrapped,
        address _token
    ) internal view returns (address[] memory route) {
        route = new address[](3);
        route[0] = _wrapped;
        route[2] = _token;

        for (uint256 i = 0; i < _allPairs.length; i++) {
            IUniswapV2Pair currentPair = _allPairs[i];
            if (
                currentPair.token0() == _token || currentPair.token1() == _token
            ) {
                address token = currentPair.token0() == _token
                    ? currentPair.token1()
                    : currentPair.token0();
                for (uint256 j = 0; j < _allPairs.length; j++) {
                    if (
                        (currentPair.token0() == token ||
                            currentPair.token1() == token) &&
                        (currentPair.token0() == _wrapped ||
                            currentPair.token1() == _wrapped)
                    ) {
                        route[1] = token;
                    }
                }
            }
        }
    }

    event Swap(address[] tokens, bool[] swapped, uint256[] amounts);

    function initiateSwap(
        IUniswapV2Router02 _router,
        uint256 _swapAmount,
        address[] memory _path
    ) internal returns (bool swapped, uint256 amount) {
        ERC20(_path[0]).transferFrom(msg.sender, address(this), _swapAmount);
        ERC20(_path[0]).approve(address(_router), _swapAmount);
        console.log("approving %s", address(_router));
        amount = _router.swapExactTokensForTokens(
            _swapAmount,
            0,
            _path,
            msg.sender,
            now
        )[_path.length - 1];
        console.log("swapped %s", amount);
        swapped = amount != 0;
    }

    function swap(
        address _router,
        uint256 _swapAmount,
        address _wrapped,
        address[] calldata _tokens
    ) external {
        IUniswapV2Router02 router = IUniswapV2Router02(_router);
        IUniswapV2Factory factory = IUniswapV2Factory(router.factory());

        IUniswapV2Pair[] memory allPairs = getAllPairs(factory);

        bool[] memory swapped = new bool[](_tokens.length);
        uint256[] memory amounts = new uint256[](_tokens.length);

        console.log("_tokens %s", _tokens.length);

        for (uint256 index = 0; index < _tokens.length; index++) {
            address pairAddress = factory.getPair(_wrapped, _tokens[index]);
            IUniswapV2Pair pair = IUniswapV2Pair(pairAddress);
            address toSwap = pair.token0() == _wrapped
                ? pair.token1()
                : pair.token0();
            if (pairAddress != nullAddr) {
                address[] memory path = new address[](2);
                path[0] = _wrapped;
                path[1] = toSwap;
                (swapped[index], amounts[index]) = initiateSwap(
                    router,
                    _swapAmount,
                    path
                );
            } else {
                address[] memory path = getRoute(allPairs, _wrapped, toSwap);
                (swapped[index], amounts[index]) = initiateSwap(
                    router,
                    _swapAmount,
                    path
                );
            }
        }
        emit Swap(_tokens, swapped, amounts);
    }
}
