// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {EIP712} from '@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol';
import {ERC721} from '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import {ERC721Enumerable} from '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {ECDSA} from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import {Strings} from '@openzeppelin/contracts/utils/Strings.sol';
import {Address} from '@openzeppelin/contracts/utils/Address.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IChange} from './interface/IChange.sol';
import {IPolyJetClub} from './interface/IPolyJetClub.sol';

contract PolyJetClub is ERC721Enumerable, EIP712, Ownable, IPolyJetClub {
    using ECDSA for bytes32;
    using Strings for uint256;

    // keccak256("Permit(address from,uint256 tokenId)");
    bytes32 public constant PERMIT_TYPEHASH = 0xc242e34b93f9ad1ffc2c2c079dea5dccebcd284285197f32e072ea272cc3eef1;
    uint256 public constant Fee = 5e04 ether;
    uint256 public constant WDCFee = 12e11;
    uint256 public constant WhiteFee = 1 ether;
    uint256 public constant WDCWhiteFee = 100000000;
    address public constant Black = 0x8888888888888888888888888888888888888888;
    string public constant baseURI = "ipfs://QmSpBhCjD3EY82nxRaruMUBkGoSEihUA79WwdtDFipeSJJ";

    IERC20 public constant WDC = IERC20(0x101D4507E0c07Aa929EF4Fd1eabcB7bcAef5e391);

    uint256 public total;
    address public change;

    mapping(uint256 => uint256) public date;

    event Claim(uint256 tokenId, address from, uint256 fee);
    event ClaimBatch(uint256[] tokenIds, address from, uint256 fee);

    constructor() ERC721("PolyJetClub", "PolyJetClub") EIP712("PolyJetClub", "1") Ownable() {}

    function charges(uint256 _fee) internal returns (uint256) {
        total++;
        if (total <= 2e03) return _fee;
        return _fee * 2 ** (total / 2e03);
    }

    function claim(uint256 tokenId, uint256 amount) external payable {
        require(tokenId > 0 && tokenId < 9001, "Token ID invalid");
        uint256 fee;
        if (amount == 0) {
            fee = msg.value;
            require(fee >= charges(Fee), "Insufficient handling fee");
            Address.sendValue(payable(Black), fee);
        } else {//wdc
            fee = amount;
            require(fee >= charges(WDCFee), "WDC insufficient handling fee");
            WDC.transferFrom(_msgSender(), Black, fee);
        }
        date[tokenId] = block.timestamp;
        _safeMint(_msgSender(), tokenId);

        emit Claim(tokenId, _msgSender(), fee);
    }

    function cliamBatch(uint256[] calldata tokenIds, uint256 amount) external payable {
        uint256 value1;
        uint256 value2;
        uint256 fee;
        if (amount == 0) {
            value1 = msg.value;
            fee = Fee;

            Address.sendValue(payable(Black), value1);
        } else {//wdc
            value1 = amount;
            fee = WDCFee;

            WDC.transferFrom(_msgSender(), Black, value1);
        }
        for (uint256 x = 0; x < tokenIds.length; x++) {
            uint256 tokenId = tokenIds[x];
            require(tokenId > 0 && tokenId < 9001, "Token ID invalid");

            value2 += charges(fee);
            date[tokenId] = block.timestamp;
            _safeMint(_msgSender(), tokenId);
        }
        require(value1 >= value2, "Insufficient handling fee");

        emit ClaimBatch(tokenIds, _msgSender(), value1);
    }

    function claimPermit(uint256 tokenId, bytes calldata _signature) external payable {
        require(tokenId > 9000 && tokenId < 10001, "Token ID invalid");
        uint256 fee;
        if (msg.value != 0) {
            fee = msg.value;
            require(fee >= WhiteFee, "Insufficient handling fee");

            Address.sendValue(payable(Black), fee);
        } else {
            fee = WDCWhiteFee;
            WDC.transferFrom(_msgSender(), Black, fee);
        }
        if (_msgSender() != owner()) {
            bytes32 digst = _hashTypedDataV4(keccak256(abi.encode(PERMIT_TYPEHASH, _msgSender(), tokenId)));
            require(digst.recover(_signature) == owner(), "Permit Failure");
        }
        date[tokenId] = block.timestamp;
        _safeMint(_msgSender(), tokenId);

        emit Claim(tokenId, _msgSender(), msg.value);
    }

    function setChange(address _change) external onlyOwner {
        change = _change;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        if (change == address(0)) {
            return string(abi.encodePacked(baseURI, tokenId.toString()));
        }
        return IChange(change).tokenURI(tokenId);
    }

    function getVIT(uint256 tokenId) external view returns (uint256) {
        if (change == address(0)) return 100;
        return IChange(change).getVIT(tokenId);
    }

    function getDate(uint256 tokenId) external view override returns (uint256) {
        return date[tokenId];
    }
}
