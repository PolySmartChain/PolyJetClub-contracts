// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract MockFee {

    uint256 public constant Fee = 5e04 ether;
    uint256 public constant WDCFee = 12e11;

    function charges(uint256 tokenId) external pure returns (uint256) {
        if (tokenId <= 2e03) return Fee;
        return Fee * 2 ** ((tokenId - 1) / 2e03);
    }

    function chargesWDC(uint256 tokenId) external pure returns (uint256) {
        if (tokenId <= 2e03) return WDCFee;
        return WDCFee * 2 ** ((tokenId - 1) / 2e03);
    }
}
