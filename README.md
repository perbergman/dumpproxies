# DumpProxies

A Solidity project for ERC20 proxy contracts using OpenZeppelin upgradeable contracts and Truffle. This project demonstrates how to manage and transfer control of upgradeable proxy contracts.

## Project Structure

- `contracts/`: Solidity smart contracts
  - `ERC20_V1.sol`: Upgradeable ERC20 token implementation
  - `ERC721Implementation.sol`: Upgradeable ERC721 token implementation
  - `ImportHelper.sol`: Helper file to import OpenZeppelin proxy contracts
- `migrations/`: Truffle migration scripts
- `scripts/`: Utility scripts
  - `complete-test-workflow.js`: Demonstrates proxy admin management
- `test/`: Test files for contracts

## Setup

1. Install dependencies:
```
npm install
```

2. Create a `.env` file based on `.env.example` and fill in your configuration:
```
cp .env.example .env
```

3. Compile contracts:
```
npm run compile
```

4. Run tests:
```
npm run test
```

5. Deploy contracts:
```
npm run deploy
```

## Features

- Upgradeable ERC20 token implementation
- OpenZeppelin contracts for security and standardization
- Truffle for compilation, testing, and deployment
- Proxy admin management and transfer workflow

## Proxy Admin Management Workflow

The `complete-test-workflow.js` script demonstrates how to change the admin of a transparent upgradeable proxy contract. This is useful for consolidating control of multiple proxies or transferring control between different entities.

### Workflow Steps

#### Step 1: Create Initial Deployment with First ProxyAdmin
- Deploy a ProxyAdmin contract to manage your proxy
- Deploy the ERC20 implementation contract (ERC20_V1)
- Deploy a TransparentUpgradeableProxy pointing to your implementation
- Initialize the implementation with token details
- Verify the proxy's admin is correctly set

#### Step 2: Create Second ProxyAdmin
- Deploy another ProxyAdmin contract that will become the new admin

#### Step 3: Import First Deployment and Get Warning
- Deploy a second proxy with the second ProxyAdmin
- Create a deployment file with mixed admin references
- Observe warnings about mismatched proxy admins
- Verify each proxy has its correct admin before changes

#### Step 4: Change TransparentUpgradeableProxy to the Second ProxyAdmin
- Use the first ProxyAdmin's `changeProxyAdmin` function to transfer admin rights
- Verify the admin slot now contains the address of the second ProxyAdmin

#### Step 5: Verify State is Correctly Preserved
- Confirm the token's name and symbol are preserved after the admin change
- Test token functionality by minting tokens through the proxy
- Verify the second ProxyAdmin can correctly manage the first proxy

### Why This Matters

- **Admin Consolidation**: Simplify management by controlling multiple proxies with one admin
- **Safe Transitions**: Preserve contract state and functionality while changing control
- **Organizational Control**: Transfer control of upgradeable contracts between different entities

### Running the Workflow

```bash
npx truffle exec scripts/complete-test-workflow.js --network development
```

## Dependencies

- Truffle: Smart contract development framework
- OpenZeppelin Contracts Upgradeable: Secure, upgradeable contract implementations
- Solidity v0.8.21: Smart contract language

## License

MIT
