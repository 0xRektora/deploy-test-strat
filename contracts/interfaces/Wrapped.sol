pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface Wrapped is IERC20 {
    function deposit() external payable;

    function name() external view returns (string memory);
}
