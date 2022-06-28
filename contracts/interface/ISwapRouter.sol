// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ISwapRouter {

    function getAmountsOut(uint amountIn, address[] memory path)
    external
    view
    returns (uint[] memory amounts);
}
