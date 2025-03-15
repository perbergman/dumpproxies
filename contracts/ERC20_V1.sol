// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";

contract ERC20_V1 is ERC20Upgradeable, MulticallUpgradeable {

    function initialize(string memory name, string memory symbol) public virtual initializer {
        __ERC20_init(name, symbol);
    }

    function mint(address addr, uint256 amount) public {
        _mint(addr, amount);
    }

    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }

    function transfer(address from, address to, uint256 amount) public {
        _transfer(from, to, amount);
    }

}
