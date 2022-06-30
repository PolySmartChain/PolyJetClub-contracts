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
import {IPolyJetClub} from './interface/IPolyJetClub.sol';
import {IProxys} from './interface/IProxys.sol';

contract PolyJetClubV2 is ERC721Enumerable, EIP712, Ownable, IPolyJetClub {
    using ECDSA for bytes32;
    using Strings for uint256;

    // keccak256("Permit(address from,uint256 tokenId)");
    bytes32 public constant PERMIT_TYPEHASH = 0xc242e34b93f9ad1ffc2c2c079dea5dccebcd284285197f32e072ea272cc3eef1;
    uint256 public constant WhiteFee = 1 ether;
    uint256 public constant WDCWhiteFee = 1 ether;

    string public baseURI = "ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/";
    uint256 public Fee = 5e04 ether;

    IProxys public Proxys;
    uint256 public total;
    address public change;

    mapping(uint256 => uint256) public date;

    event Claim(uint256 tokenId, address from, uint256 fee);
    event ClaimBatch(uint256[] tokenIds, address from, uint256 fee);
    event Migration(address from, uint256[] tokenIds);

    constructor(address _proxys, uint256 _total) ERC721("PolyJetClub", "PolyJetClub") EIP712("PolyJetClub", "1") Ownable() {
        Proxys = IProxys(_proxys);
        total = _total;
    }

    function _asSingletonArray(uint256 element) private pure returns (uint256[] memory) {
        uint256[] memory array = new uint256[](1);
        array[0] = element;

        return array;
    }

    function charges(uint256 _fee) internal returns (uint256) {
        total++;
        if (total < 2001) return _fee;
        return _fee * 2 ** ((total - 1) / 2e03);
    }

    function claim(uint256 tokenId) external payable {
        require(tokenId > 0 && tokenId < 9001, "Token ID invalid");
        require(Proxys.hasMint(_asSingletonArray(tokenId)), "Token already minted");
        uint256 PSCFee = charges(Fee);
        uint256 nowFee = msg.value;
        if (nowFee > 0) {
            require(nowFee >= PSCFee, "Insufficient handling fee");
            Address.sendValue(payable(Proxys.getBlack()), nowFee);
        } else {//wdc
            nowFee = Proxys.getAmountsOut(PSCFee);
            Proxys.transferFromWDC(_msgSender(), nowFee);
        }
        date[tokenId] = block.timestamp;
        _safeMint(_msgSender(), tokenId);

        emit Claim(tokenId, _msgSender(), nowFee);
    }

    function claimBatch(uint256[] calldata tokenIds) external payable {
        require(tokenIds.length > 0, "Abnormal tokenIds length");
        require(Proxys.hasMint(tokenIds), "Token already minted");
        uint256 value1;
        uint256 nowFee = msg.value;
        for (uint256 x = 0; x < tokenIds.length; x++) {
            uint256 tokenId = tokenIds[x];
            require(tokenId > 0 && tokenId < 9001, "Token ID invalid");

            value1 += charges(Fee);
            date[tokenId] = block.timestamp;
            _safeMint(_msgSender(), tokenId);
        }
        if (nowFee > 0) {
            require(nowFee >= value1, "Insufficient handling fee");
            Address.sendValue(payable(Proxys.getBlack()), nowFee);
        } else {
            nowFee = Proxys.getAmountsOut(value1);
            Proxys.transferFromWDC(_msgSender(), nowFee);
        }

        emit ClaimBatch(tokenIds, _msgSender(), nowFee);
    }

    function claimPermit(uint256 tokenId, bytes calldata _signature) external payable {
        require(tokenId > 9000 && tokenId < 10001, "Token ID invalid");
        require(Proxys.hasMint(_asSingletonArray(tokenId)), "Token already minted");
        uint256 fee;
        if (msg.value > 0) {
            fee = msg.value;
            require(fee >= WhiteFee, "Insufficient handling fee");

            Address.sendValue(payable(Proxys.getBlack()), fee);
        } else {
            fee = WDCWhiteFee;
            Proxys.transferFromWDC(_msgSender(), fee);
        }
        if (_msgSender() != owner()) {
            bytes32 digst = _hashTypedDataV4(keccak256(abi.encode(PERMIT_TYPEHASH, _msgSender(), tokenId)));
            require(digst.recover(_signature) == owner(), "Permit Failure");
        }
        date[tokenId] = block.timestamp;
        _safeMint(_msgSender(), tokenId);

        emit Claim(tokenId, _msgSender(), msg.value);
    }

    function claimMigration() external {
        uint256[] memory tokenIds = Proxys.getTokenIds(msg.sender);
        require(tokenIds.length > 0, "Don't need to migration");
        for (uint256 x = 0; x < tokenIds.length; x++) {
            uint256 tokenId = tokenIds[x];
            date[tokenId] = block.timestamp;
            _safeMint(_msgSender(), tokenId);

            Proxys.transferFrom(msg.sender, tokenId);
        }

        emit Migration(msg.sender, tokenIds);
    }

    function setFee(uint256 _fee) external onlyOwner {
        Fee = _fee;
    }

    function setProxys(address _proxys) external onlyOwner {
        Proxys = IProxys(_proxys);
    }

    function setChange(address _change) external onlyOwner {
        change = _change;
    }

    function setURI(string calldata _uri) external onlyOwner {
        baseURI = _uri;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        if (change == address(0)) {
            return string(abi.encodePacked(baseURI, tokenId.toString()));
        }
        return IChange(change).tokenURI(tokenId);
    }

    function getVit(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        if (change == address(0)) return 100;
        return IChange(change).getVit(tokenId);
    }

    function getDate(uint256 tokenId) external view override returns (uint256) {
        return date[tokenId];
    }
}
