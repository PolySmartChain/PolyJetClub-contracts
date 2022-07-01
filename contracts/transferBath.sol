// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IPolyJetClub} from './interface/IPolyJetClub.sol';

contract transferBath {

    IPolyJetClub public polyjetclub = IPolyJetClub(0xC04cb528Ef1c182d053e84bf1705C9E2b2a3deAf);

    function tranbath(uint256 amount, address to) external {
        uint256 length = polyjetclub.balanceOf(msg.sender);
        require(length == 0 && length >= amount, "Error");
        for (uint256 x = 0; x < amount; x++) {
            uint256 tokenId = polyjetclub.tokenOfOwnerByIndex(msg.sender, x);
            polyjetclub.transferFrom(msg.sender, to, tokenId);
        }
    }

}
