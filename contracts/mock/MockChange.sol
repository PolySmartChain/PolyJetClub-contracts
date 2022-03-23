// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Strings} from '@openzeppelin/contracts/utils/Strings.sol';
import {IPineapple} from '../interface/IPineapple.sol';
import {IChange} from '../interface/IChange.sol';

contract MockChange is IChange, Ownable {
    using Strings for uint256;

    uint256 public constant totalVIT = 100;

    uint256 public interval = 12 hours;
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

    function getLastTimestamp
    (
        TokenInfo memory tokenInfo,
        uint256 tokenId
    ) internal view returns (uint256 newLastTimestamp) {
        uint256 date = pineapple.getDate(tokenId);
        if (tokenInfo.lastTimestamp == 0) {//init
            newLastTimestamp = beginTime > date ? beginTime : date;
        } else {
            newLastTimestamp = tokenInfo.lastTimestamp;
        }
    }

    function getAttributes
    (
        TokenInfo memory tokenInfo,
        uint256 lastTimestamp,
        uint256 tokenId
    ) internal view returns (uint256, string memory) {
        uint256 output = (lastTimestamp - block.timestamp) / interval;
        uint256 lastVIT = output > tokenInfo.vit ? 0 : tokenInfo.vit - output;
        for (uint256 x = 0; x < attributes.length; x++) {
            if (attributes[x].attr <= lastVIT) {
                return (lastVIT, string(abi.encodePacked(attributes[x].uri, tokenId.toString())));
            }
        }
        return (0, "");
    }

    //from max to min
    function setAttributes(Attribute[] memory _attributes) external onlyOwner {
        _setAttributes(_attributes);
    }

    function setInterval(uint256 _interval) external onlyOwner {
        interval = _interval;
    }

    function tokenURI
    (
        uint256 tokenId
    )
    external view override returns (string memory uri) {
        TokenInfo memory tokenInfo = tokenInfos[tokenId];
        uint256 lastTimestamp = getLastTimestamp(tokenInfo, tokenId);
        (, uri) = getAttributes(tokenInfo, lastTimestamp, tokenId);
    }

    function getVIT
    (
        uint256 tokenId
    ) external view override returns (uint256 vit) {
        TokenInfo memory tokenInfo = tokenInfos[tokenId];
        uint256 lastTimestamp = getLastTimestamp(tokenInfo, tokenId);
        (vit,) = getAttributes(tokenInfo, lastTimestamp, tokenId);
    }
}
