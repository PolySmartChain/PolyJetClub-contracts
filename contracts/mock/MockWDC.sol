// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockWDC is ERC20 {

    constructor() ERC20("MockWDC", "MockWDC") {
        _mint(msg.sender, 1e17);
    }

    function decimals() public pure override returns (uint8) {
        return 8;
    }
}
