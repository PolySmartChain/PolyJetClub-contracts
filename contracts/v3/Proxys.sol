// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IProxys} from './IProxys.sol';
import {ISwapRouter} from '../interface/ISwapRouter.sol';

contract Proxys is Ownable, IProxys {

    address private Black = 0x8888888888888888888888888888888888888888;
    IERC20 public WDC;
    address public WPSC;
    ISwapRouter public swapRouter;
    address public polyJetClubV3;

    enum Type {WDC, WPSC, SwapRouter, PolyJetClubV3, Black}

    modifier CheckCall() {
        require(msg.sender == polyJetClubV3, "Permission denied");
        _;
    }

    constructor(address _WDC, address _WPSC, address _swap) Ownable() {
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
        if (state == uint(Type.PolyJetClubV3)) {
            polyJetClubV3 = to;
            return;
        }
        if (state == uint(Type.Black)) {
            Black = to;
            return;
        }
    }

    function transferFromWDC(address from, uint256 amount) external override CheckCall {
        WDC.transferFrom(from, Black, amount);
    }

    function getAmountsOut(uint256 PSCFee) external view override returns (uint256) {
        return swapRouter.getAmountsOut(PSCFee, getPath())[1];
    }

    function getBlack() external view override returns (address) {
        return Black;
    }
}
