// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IChange {

    function tokenURI(uint256 tokenId) external view returns(string memory);

    function getVit(uint256 tokenId) external view returns (uint256);
}
