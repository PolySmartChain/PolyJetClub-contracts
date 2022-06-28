// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC721Enumerable} from '@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol';

interface IPolyJetClub is IERC721Enumerable  {

    function getDate(uint256 tokenId) external view returns (uint256);
}
