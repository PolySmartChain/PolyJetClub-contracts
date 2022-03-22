// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {EIP712} from '@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol';
import {ERC721} from '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import {ERC721Enumerable} from '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {ECDSA} from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import {Strings} from '@openzeppelin/contracts/utils/Strings.sol';
import {Address} from '@openzeppelin/contracts/utils/Address.sol';
import {IChange} from './interface/IChange.sol';

contract Pineapple is ERC721Enumerable, EIP712, Ownable {
    using ECDSA for bytes32;
    using Strings for uint256;

    // keccak256("Permit(address from,uint256 tokenId)");
    bytes32 public constant PERMIT_TYPEHASH = 0xc242e34b93f9ad1ffc2c2c079dea5dccebcd284285197f32e072ea272cc3eef1;
    uint256 public constant Fee = 50000 ether;
    uint256 public constant WhiteFee = 1 ether;
    string public constant baseURI = "ipfs://";

    uint256 public total;
    address public change;

    event Claim(uint256 tokenId, address from, uint256 fee);

    constructor() ERC721("Pineapple", "Pineapple") EIP712("Pineapple", "1") Ownable() {}

    function charges() internal returns (uint256) {
        total++;
        if (total <= 2000) return Fee;
        return Fee * 2 ** (total / 2e03);
    }

    function claim(uint256 tokenId) external payable {
        require(tokenId > 0 && tokenId < 9001, "Token ID invalid");
        require(msg.value >= charges(), "Insufficient handling fee");

        _safeMint(_msgSender(), tokenId);
        Address.sendValue(payable(owner()), msg.value);

        emit Claim(tokenId, _msgSender(), msg.value);
    }

    function claimPermit(uint256 tokenId, bytes calldata _signature) external payable {
        require(tokenId > 9000 && tokenId < 10001, "Token ID invalid");
        require(msg.value >= WhiteFee, "Insufficient handling fee");
        if (_msgSender() != owner()) {
            bytes32 digst = _hashTypedDataV4(keccak256(abi.encode(PERMIT_TYPEHASH, _msgSender(), tokenId)));
            require(digst.recover(_signature) == owner(), "Permit Failure");
        }
        _safeMint(_msgSender(), tokenId);
        Address.sendValue(payable(owner()), msg.value);

        emit Claim(tokenId, _msgSender(), msg.value);
    }

    function setChange(address _change) external onlyOwner {
        change = _change;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (change == address(0)) {
            return string(abi.encodePacked(baseURI, tokenId.toString()));
        }
        return IChange(change).tokenURI(tokenId);
    }

    function getVIT(uint256 tokenId) external view returns (uint256) {
        if (change == address(0)) return 100;
        return IChange(change).getVIT(tokenId);
    }
}
