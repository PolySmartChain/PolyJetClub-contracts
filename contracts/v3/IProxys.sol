// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IProxys {

    function transferFromWDC(address from, uint256 amount) external;

    function getAmountsOut(uint256 PSCFee) external view returns (uint256);

    function getBlack() external view returns (address);

}
