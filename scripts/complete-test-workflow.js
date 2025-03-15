// scripts/complete_test_workflow.js

const TransparentUpgradeableProxy = artifacts.require("TransparentUpgradeableProxyWrapper");
const ProxyAdmin = artifacts.require("ProxyAdminWrapper");
const ERC20_V1 = artifacts.require('ERC20_V1');

const fs = require('fs');
const path = require('path');

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        const deployer = accounts[0];
        console.log(`Using deployer account: ${deployer}`);

        const networkId = await web3.eth.net.getId();
        console.log('Network ID:', networkId);

        console.log('\n=====================================================');
        console.log('STEP 1: CREATE INITIAL DEPLOYMENT WITH FIRST PROXYADMIN');
        console.log('=====================================================');

        // Deploy first ProxyAdmin
        console.log('Deploying first ProxyAdmin...');
        const firstProxyAdmin = await ProxyAdmin.new({from: deployer});
        console.log(`First ProxyAdmin deployed at: ${firstProxyAdmin.address}`);

        // Deploy implementation
        console.log('Deploying ERC20 implementation...');
        const erc20Implementation = await ERC20_V1.new({from: deployer});
        console.log(`ERC20 implementation deployed at: ${erc20Implementation.address}`);

        // Deploy proxy with first admin
        console.log('Deploying first proxy with first ProxyAdmin...');
        const initData = erc20Implementation.contract.methods.initialize("FirstToken", "FT1").encodeABI();
        const firstProxy = await TransparentUpgradeableProxy.new(
            erc20Implementation.address,
            firstProxyAdmin.address,
            initData,
            {from: deployer}
        );
        console.log(`First proxy deployed at: ${firstProxy.address}`);

        // Save the deployment info to a file
        const firstDeploymentInfo = {
            admin: firstProxyAdmin.address,
            proxies: [
                {
                    address: firstProxy.address,
                    kind: "transparent"
                }
            ],
            impls: {
                [web3.utils.soliditySha3("ERC20_V1")]: {
                    address: erc20Implementation.address
                }
            }
        };

        const firstNetworkFile = path.join(__dirname, '..', '.openzeppelin', `first-network-${networkId}.json`);
        fs.mkdirSync(path.join(__dirname, '..', '.openzeppelin'), {recursive: true});
        fs.writeFileSync(firstNetworkFile, JSON.stringify(firstDeploymentInfo, null, 2));
        console.log(`First deployment info saved to ${firstNetworkFile}`);

        // Verify the first proxy has the correct admin
        const ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
        let adminSlotData = await web3.eth.getStorageAt(firstProxy.address, ADMIN_SLOT);
        let actualAdmin = '0x' + adminSlotData.slice(26).toLowerCase();
        console.log(`First proxy admin (from storage): ${actualAdmin}`);
        console.log(`First ProxyAdmin address: ${firstProxyAdmin.address.toLowerCase()}`);
        console.log(`Admin verification: ${actualAdmin === firstProxyAdmin.address.toLowerCase() ? 'PASSED ✅' : 'FAILED ❌'}`);

        console.log('\n=====================================================');
        console.log('STEP 2: CREATE SECOND PROXYADMIN');
        console.log('=====================================================');

        // Deploy second ProxyAdmin
        console.log('Deploying second ProxyAdmin...');
        const secondProxyAdmin = await ProxyAdmin.new({from: deployer});
        console.log(`Second ProxyAdmin deployed at: ${secondProxyAdmin.address}`);

        console.log('\n=====================================================');
        console.log('STEP 3: IMPORT FIRST DEPLOYMENT AND GET WARNING');
        console.log('=====================================================');

        // Simulate the import process by creating a new deployment with second admin
        // but trying to manage the first proxy
        console.log('Deploying second proxy with second ProxyAdmin...');
        const secondProxy = await TransparentUpgradeableProxy.new(
            erc20Implementation.address,
            secondProxyAdmin.address,
            initData,
            {from: deployer}
        );
        console.log(`Second proxy deployed at: ${secondProxy.address}`);

        // Create a second network file that includes both proxies but only lists the second admin
        const secondDeploymentInfo = {
            admin: secondProxyAdmin.address, // This differs from the first proxy's actual admin
            proxies: [
                {
                    address: firstProxy.address, // First proxy (still has firstProxyAdmin)
                    kind: "transparent"
                },
                {
                    address: secondProxy.address, // Second proxy (has secondProxyAdmin)
                    kind: "transparent"
                }
            ],
            impls: {
                [web3.utils.soliditySha3("ERC20_V1")]: {
                    address: erc20Implementation.address
                }
            }
        };

        const secondNetworkFile = path.join(__dirname, '..', '.openzeppelin', `unknown-${networkId}.json`);
        fs.writeFileSync(secondNetworkFile, JSON.stringify(secondDeploymentInfo, null, 2));
        console.log(`Second deployment info saved to ${secondNetworkFile}`);

        // Simulate the warning
        console.log('\nSIMULATED WARNING:');
        console.log(`Warning: Imported proxy with admin at '${firstProxyAdmin.address}' which differs from previously deployed admin '${secondProxyAdmin.address}'`);
        console.log('   The imported proxy admin is different from the proxy admin that was previously deployed on this network.');
        console.log('   This proxy will not be upgradable directly by the plugin.');
        console.log(`   To upgrade this proxy, use the prepareUpgrade function and then upgrade it using the admin at '${firstProxyAdmin.address}'.`);

        // Check each proxy's admin
        console.log('\nVerifying current admin setup:');
        let firstProxyAdminSlot = await web3.eth.getStorageAt(firstProxy.address, ADMIN_SLOT);
        let firstProxyAdminAddress = '0x' + firstProxyAdminSlot.slice(26).toLowerCase();
        console.log(`First proxy (${firstProxy.address}) admin: ${firstProxyAdminAddress}`);

        let secondProxyAdminSlot = await web3.eth.getStorageAt(secondProxy.address, ADMIN_SLOT);
        let secondProxyAdminAddress = '0x' + secondProxyAdminSlot.slice(26).toLowerCase();
        console.log(`Second proxy (${secondProxy.address}) admin: ${secondProxyAdminAddress}`);

        console.log('\n=====================================================');
        console.log('STEP 4: CHANGE TRANSPARENTUPGRADEABLEPROXY TO THE SECOND PROXYADMIN');
        console.log('=====================================================');

        console.log(`Changing admin of first proxy from ${firstProxyAdminAddress} to ${secondProxyAdmin.address.toLowerCase()}...`);

        // Use the first ProxyAdmin to change the admin of the first proxy
        await firstProxyAdmin.changeProxyAdmin(firstProxy.address, secondProxyAdmin.address, {from: deployer});

        // Verify the change
        firstProxyAdminSlot = await web3.eth.getStorageAt(firstProxy.address, ADMIN_SLOT);
        firstProxyAdminAddress = '0x' + firstProxyAdminSlot.slice(26).toLowerCase();
        console.log(`New first proxy admin (from storage): ${firstProxyAdminAddress}`);
        console.log(`Second ProxyAdmin address: ${secondProxyAdmin.address.toLowerCase()}`);
        console.log(`Admin change verification: ${firstProxyAdminAddress === secondProxyAdmin.address.toLowerCase() ? 'PASSED ✅' : 'FAILED ❌'}`);

        console.log('\n=====================================================');
        console.log('STEP 5: VERIFY STATE IS CORRECTLY PRESERVED');
        console.log('=====================================================');

        // Create contract instance to interact with proxy
        const ERC20 = artifacts.require('ERC20_V1');
        const firstProxyToken = await ERC20.at(firstProxy.address);

        // Check token details
        const name = await firstProxyToken.name();
        const symbol = await firstProxyToken.symbol();

        console.log('Token state verification:');
        console.log(`Name: ${name}`);
        console.log(`Symbol: ${symbol}`);
        console.log(`State verification: ${name === "FirstToken" && symbol === "FT1" ? 'PASSED ✅' : 'FAILED ❌'}`);

        // Try to mint some tokens using the proxy (this tests functionality preserved)
        console.log('\nTesting functionality by minting tokens...');
        await firstProxyToken.mint(deployer, 1000, {from: deployer});
        const balance = await firstProxyToken.balanceOf(deployer);
        console.log(`Token balance after mint: ${balance.toString()}`);
        console.log(`Functionality verification: ${balance.toString() === '1000' ? 'PASSED ✅' : 'FAILED ❌'}`);

        // Final verification
        try {
            // Try to get implementation through the second admin
            const implAddress = await secondProxyAdmin.getProxyImplementation(firstProxy.address);
            console.log(`\nImplementation address via second admin: ${implAddress}`);
            console.log(`Original implementation: ${erc20Implementation.address}`);
            console.log(`Implementation verification: ${implAddress === erc20Implementation.address ? 'PASSED ✅' : 'FAILED ❌'}`);

            console.log('\n🎉 The admin change was successful and all state was preserved!');
            console.log('✅ The second ProxyAdmin can now manage the first proxy as well');
        } catch (error) {
            console.error('\n❌ Failed to verify implementation through second admin:', error.message);
        }

        callback();
    } catch (error) {
        console.error('Error during test workflow:', error);
        callback(error);
    }
};
