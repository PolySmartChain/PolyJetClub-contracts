// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

//import {IERC721Enumerable} from '@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IProxys} from './interface/IProxys.sol';
import {IPolyJetClub} from './interface/IPolyJetClub.sol';
import {ISwapRouter} from './interface/ISwapRouter.sol';

contract Proxys is Ownable, IProxys {

    bytes4 public constant OwnerOf = bytes4(keccak256(bytes('ownerOf(uint256)')));
    address public Black = 0x8888888888888888888888888888888888888888;
    IERC20 public WDC;
    address public WPSC;
    ISwapRouter public swapRouter;
    IPolyJetClub public polyJetClub;
    address public polyJetClubV2;

    enum Type {WDC, WPSC, SwapRouter, PolyJetClub, PolyJetClubV2, Black}

    modifier CheckCall() {
        require(msg.sender == polyJetClubV2, "Permission denied");
        _;
    }

    constructor(address _polyJetClub, address _WDC, address _WPSC, address _swap) Ownable() {
        polyJetClub = IPolyJetClub(_polyJetClub);
        WDC = IERC20(_WDC);
        WPSC = _WPSC;
        swapRouter = ISwapRouter(_swap);
    }

    function getPath() internal view returns (address[] memory) {
        address[] memory path = new address[](2);
        path[0] = WPSC;
        path[1] = address(WDC);
        return path;
    }

    function setConfig(uint256 state, address to) external onlyOwner {
        if (state == uint(Type.WDC)) {
            WDC = IERC20(to);
            return;
        }
        if (state == uint(Type.WPSC)) {
            WPSC = to;
            return;
        }
        if (state == uint(Type.SwapRouter)) {
            swapRouter = ISwapRouter(to);
            return;
        }
        if (state == uint(Type.PolyJetClub)) {
            polyJetClub = IPolyJetClub(to);
            return;
        }
        if (state == uint(Type.PolyJetClubV2)) {
            polyJetClubV2 = to;
            return;
        }
        if (state == uint(Type.Black)) {
            Black = to;
            return;
        }
    }

    function transferFrom(address from, uint256 tokenId) external override CheckCall {
        polyJetClub.transferFrom(from, Black, tokenId);
    }

    function transferFromWDC(address from, uint256 amount) external override CheckCall {
        WDC.transferFrom(from, Black, amount);
    }

    function hasMint(uint256[] calldata tokenIds) external view override returns (bool) {
        for (uint256 x = 0; x < tokenIds.length; x++) {
            uint256 date = polyJetClub.getDate(tokenIds[x]);
            if (date > 0) {
                return false;
            }
        }
        return true;
    }

    function getAmountsOut(uint256 PSCFee) external view override returns (uint256) {
        return swapRouter.getAmountsOut(PSCFee, getPath())[1];
    }

    function getTokenIds(address from) external view override returns (uint256[] memory) {
        uint256 length = polyJetClub.balanceOf(from);
        if (length == 0) return new uint256[](0);
        uint256[] memory tokenIds = new uint256[](length);
        for (uint256 x = 0; x < length; x++) {
            tokenIds[x] = polyJetClub.tokenOfOwnerByIndex(from, x);
        }
        return tokenIds;
    }

    function getBlack() external view override returns (address) {
        return Black;
    }
}
