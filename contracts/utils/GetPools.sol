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

interface IUniswapV2Pair {
    function token0() external view returns (address);

    function token1() external view returns (address);
}

interface IStruct {
    // Info of each pool.
    struct PoolInfo {
        address lpToken; // Address of LP token contract.
        uint256 allocPoint; // How many allocation points assigned to this pool. WASPs to distribute per block.
        uint256 lastRewardTimestamp; // Last block number that WASPs distribution occurs.
        uint256 accRewardPerShare; // Accumulated WASPs per share, times 1e12. See below.
    }
}

interface IMasterChef is IStruct {
    function poolInfo(uint256 _poolId) external view returns (PoolInfo memory);

    function poolLength() external view returns (uint256);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB)
        external
        view
        returns (address pair);

    function allPairs(uint256) external view returns (address pair);

    function allPairsLength() external view returns (uint256);

    function feeTo() external view returns (address);

    function feeToSetter() external view returns (address);

    function createPair(address tokenA, address tokenB)
        external
        returns (address pair);
}

contract GetPools is IStruct {
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

    function getPools(address _masterchef)
        external
        view
        returns (FormattedPoolInfo[] memory)
    {
        IMasterChef _masterchef = IMasterChef(_masterchef);
        uint256 _poolsLength = _masterchef.poolLength();
        FormattedPoolInfo[] memory _formattedPoolInfo = new FormattedPoolInfo[](
            _poolsLength
        );

        for (uint256 _index = 0; _index < _poolsLength; _index++) {
            PoolInfo memory _poolInfo = _masterchef.poolInfo(_index);
            IUniswapV2Pair _lpPair = IUniswapV2Pair(_poolInfo.lpToken);
            ERC20 _token0 = ERC20(_lpPair.token0());
            ERC20 _token1 = ERC20(_lpPair.token1());

            _formattedPoolInfo[_index] = FormattedPoolInfo({
                id: _index,
                lpToken: _poolInfo.lpToken,
                lpPair: string(
                    abi.encodePacked(_token0.name(), " - ", _token1.name())
                ),
                allocPoint: _poolInfo.allocPoint,
                token0: TokenInfo({
                    name: _token0.name(),
                    tAddress: address(_token0)
                }),
                token1: TokenInfo({
                    name: _token1.name(),
                    tAddress: address(_token1)
                })
            });
        }
        return _formattedPoolInfo;
    }
}
