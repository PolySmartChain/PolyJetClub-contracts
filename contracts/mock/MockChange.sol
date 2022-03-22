// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {IPineapple} from '../interface/IPineapple.sol';
import {IChange} from '../interface/IChange.sol';

contract MockChange is IChange, Ownable {

    uint256 public constant totalVIT = 100;

    uint256 public beginTime;
    IPineapple public pineapple;

    struct Attribute {
        uint256 attr;
        string uri;
    }

    struct TokenInfo {
        uint256 vit;
        uint256 lastTimestamp;
    }

    Attribute[] public attributes;
    mapping(uint256 => TokenInfo) public tokenInfos;

    constructor(address _pineapple, Attribute[] memory _attributes) Ownable() {
        beginTime = block.timestamp;
        pineapple = IPineapple(_pineapple);
        _setAttributes(_attributes);
    }

    function _setAttributes(Attribute[] memory _attributes) internal {
        for (uint256 x = 0; x < _attributes.length; x++) {
            Attribute memory attribute = _attributes[x];
            require(bytes(attribute.uri).length > 0, "Error uri");
            if (x != 0) require(attributes[x - 1].attr > attribute.attr, "Error attr");
            attributes[x] = attribute;
        }
    }

    function setAttributes(Attribute[] memory _attributes) external onlyOwner {
        _setAttributes(_attributes);
    }

    function tokenURI(uint256 tokenId) external view override returns (string memory) {

        return "";
    }

    function getVIT(uint256 tokenId) external view override returns (uint256) {
        return 0;
    }
}
