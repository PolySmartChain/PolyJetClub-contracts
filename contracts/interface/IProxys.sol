// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IProxys {

    function transferFrom(address from, uint256 tokenId) external;

    function transferFromWDC(address from, uint256 amount) external;

    function hasMint(uint256[] calldata tokenIds) external view returns (bool);

    function getAmountsOut(uint256 PSCFee) external view returns (uint256);

    function getTokenIds(address from) external view returns (uint256[] memory);

    function getBlack() external view returns (address);

}
