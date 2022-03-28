// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Strings} from '@openzeppelin/contracts/utils/Strings.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IERC721} from '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import {IPolyJetClub} from '../interface/IPolyJetClub.sol';
import {IChange} from '../interface/IChange.sol';

contract MockChange is IChange, Ownable {
    using Strings for uint256;

    uint256 public constant totalVIT = 100;

    uint256 public interval = 1 minutes;
    uint256 public beginTime;
    IPolyJetClub public pineapple;

    IERC20 public erc20;
    uint256 public per = 100 ether;

    IERC721 public erc721;

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
        pineapple = IPolyJetClub(_pineapple);
        _setAttributes(_attributes);
    }

    function _setAttributes(Attribute[] memory _attributes) internal {
        for (uint256 x = 0; x < _attributes.length; x++) {
            Attribute memory attribute = _attributes[x];
            require(bytes(attribute.uri).length > 0, "Error uri");
            if (x != 0) require(attributes[x - 1].attr > attribute.attr, "Error attr");
            attributes.push(attribute);
        }
    }

    function _getLastVIT(TokenInfo memory tokenInfo, uint256 tokenId) internal view returns (uint256) {
        uint256 date = pineapple.getDate(tokenId);
        uint256 lastTimestamp;
        if (tokenInfo.lastTimestamp == 0) {//init
            lastTimestamp = beginTime > date ? beginTime : date;
        } else {
            lastTimestamp = tokenInfo.lastTimestamp;
        }
        uint256 output = (lastTimestamp - block.timestamp) / interval;
        return output > tokenInfo.vit ? 0 : tokenInfo.vit - output;
    }

    function getAttributes
    (
        TokenInfo memory tokenInfo,
        uint256 tokenId
    ) internal view returns (uint256, string memory) {
        uint256 lastVIT = _getLastVIT(tokenInfo, tokenId);
        for (uint256 x = 0; x < attributes.length; x++) {
            if (attributes[x].attr <= lastVIT) {
                return (lastVIT, string(abi.encodePacked(attributes[x].uri, tokenId.toString())));
            }
        }
        return (0, "");
    }

    //erc20
    function addVIT(uint256 tokenId, uint256 amount) external {
        require(amount >= per, "Error amount");
        TokenInfo storage tokenInfo = tokenInfos[tokenId];
        uint256 vit = _getLastVIT(tokenInfo, tokenId);
        require(vit > 0, "Error VIT");
        uint256 out = amount % per;
        if (out != 0) {
            amount = amount - out;
        }
        erc20.transferFrom(msg.sender, owner(), amount);

        uint256 mult = amount / per;
        tokenInfo.vit += mult;
        tokenInfo.lastTimestamp = block.timestamp;
    }

    //erc721
    function resurgence(uint256 tokenId, uint256 tokenId_721) external {
        TokenInfo storage tokenInfo = tokenInfos[tokenId];
        uint256 vit = _getLastVIT(tokenInfo, tokenId);
        require(vit == 0, "Error VIT");

        erc721.transferFrom(msg.sender, owner(), tokenId_721);
        tokenInfo.vit = totalVIT;
        tokenInfo.lastTimestamp = block.timestamp;
    }

    //from max to min
    function setAttributes(Attribute[] memory _attributes) external onlyOwner {
        _setAttributes(_attributes);
    }

    function setInterval(uint256 _interval) external onlyOwner {
        interval = _interval;
    }

    function setERC20(address _token, uint256 _per) external onlyOwner {
        erc20 = IERC20(_token);
        per = _per;
    }

    function setERC721(address _erc721) external onlyOwner {
        erc721 = IERC721(_erc721);
    }

    function tokenURI
    (
        uint256 tokenId
    )
    external view override returns (string memory uri) {
        TokenInfo memory tokenInfo = tokenInfos[tokenId];
        (, uri) = getAttributes(tokenInfo, tokenId);
    }

    function getVIT
    (
        uint256 tokenId
    ) external view override returns (uint256 vit) {
        TokenInfo memory tokenInfo = tokenInfos[tokenId];
        vit = _getLastVIT(tokenInfo, tokenId);
    }
}
