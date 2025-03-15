// scripts/generate_proxy_admin_diagram.js
const fs = require('fs');
const path = require('path');

// List of proxy addresses to analyze
// Replace with your actual proxy addresses or read from a file
const PROXY_ADDRESSES = [
  '0x547325fDCF5EF2cC0A1d78b95727bF4417581eC0',
  '0x80efcdE4313326B4F350abA8c7918ABdaC7448e3'
  // Add all your proxies here
];

// Your expected main admin (optional)
const MAIN_ADMIN = '0x04Ac0143BCd5efd7f9f77099Eb7dDf34448BE003';

module.exports = async function(callback) {
  try {
    console.log('Analyzing proxy and admin relationships...');
    
    // Storage slots per EIP-1967
    const ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
    const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
    
    // Data structure to hold our findings
    const data = {
      proxies: {},
      admins: {},
      implementations: new Set()
    };
    
    // Analyze each proxy
    for (const proxyAddress of PROXY_ADDRESSES) {
      console.log(`Analyzing proxy ${proxyAddress}...`);
      
      // Get admin address
      const adminSlotData = await web3.eth.getStorageAt(proxyAddress, ADMIN_SLOT);
      const adminAddress = '0x' + adminSlotData.slice(26).toLowerCase();
      
      // Get implementation address
      const implSlotData = await web3.eth.getStorageAt(proxyAddress, IMPLEMENTATION_SLOT);
      const implementationAddress = '0x' + implSlotData.slice(26).toLowerCase();
      
      // Store in our data structure
      data.proxies[proxyAddress.toLowerCase()] = {
        admin: adminAddress,
        implementation: implementationAddress
      };
      
      // Track admins
      if (!data.admins[adminAddress]) {
        data.admins[adminAddress] = {
          proxies: [],
          bytecodeHash: null
        };
      }
      data.admins[adminAddress].proxies.push(proxyAddress.toLowerCase());
      
      // Track implementations
      data.implementations.add(implementationAddress);
      
      console.log(`  Admin: ${adminAddress}`);
      console.log(`  Implementation: ${implementationAddress}`);
    }
    
    // Get bytecode for admin contracts
    for (const adminAddress of Object.keys(data.admins)) {
      try {
        const bytecode = await web3.eth.getCode(adminAddress);
        const bytecodeHash = web3.utils.keccak256(bytecode);
        data.admins[adminAddress].bytecodeHash = bytecodeHash;
        data.admins[adminAddress].bytecodeSize = bytecode.length;
        
        console.log(`Admin ${adminAddress}: Bytecode hash ${bytecodeHash}, size ${bytecode.length}`);
      } catch (error) {
        console.error(`Could not get bytecode for admin ${adminAddress}:`, error.message);
      }
    }
    
    // Group admins by bytecode hash
    const adminsByBytecode = {};
    for (const [address, info] of Object.entries(data.admins)) {
      if (info.bytecodeHash) {
        if (!adminsByBytecode[info.bytecodeHash]) {
          adminsByBytecode[info.bytecodeHash] = [];
        }
        adminsByBytecode[info.bytecodeHash].push(address);
      }
    }
    
    // Generate colors for each admin
    const colors = [
      "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", 
      "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
    ];
    
    const adminColors = {};
    let colorIndex = 0;
    
    // First assign colors to admins grouped by bytecode
    for (const hash of Object.keys(adminsByBytecode)) {
      const hashColor = colors[colorIndex % colors.length];
      colorIndex++;
      
      for (const admin of adminsByBytecode[hash]) {
        adminColors[admin] = hashColor;
      }
    }
    
    // Generate Mermaid diagram
    let mermaidCode = 'graph TD\n';
    
    // Add nodes for admins
    for (const [adminAddress, info] of Object.entries(data.admins)) {
      const shortAddr = adminAddress.substring(0, 6) + '...' + adminAddress.substring(38);
      const color = adminColors[adminAddress] || "#999999";
      const isMainAdmin = adminAddress.toLowerCase() === MAIN_ADMIN?.toLowerCase();
      
      const proxiesCount = info.proxies.length;
      const label = isMainAdmin 
        ? `Admin ${shortAddr}\\nMain Admin\\n(${proxiesCount} proxies)`
        : `Admin ${shortAddr}\\n(${proxiesCount} proxies)`;
      
      mermaidCode += `    Admin_${adminAddress.substring(2, 8)} ["${label}"]`;
      mermaidCode += ` style Admin_${adminAddress.substring(2, 8)} fill:${color},stroke:#333,stroke-width:2px`;
      
      if (isMainAdmin) {
        mermaidCode += `,stroke-dasharray: 5 5`;
      }
      
      mermaidCode += '\n';
    }
    
    // Add nodes for proxies and connections to admins
    for (const [proxyAddress, info] of Object.entries(data.proxies)) {
      const shortAddr = proxyAddress.substring(0, 6) + '...' + proxyAddress.substring(38);
      const adminColor = adminColors[info.admin] || "#999999";
      
      // Get proxy contract type if possible (ERC20, ERC721, etc.)
      let proxyType = '';
      try {
        // Try to determine if it's an ERC20 or ERC721
        const isERC20 = await web3.eth.call({
          to: proxyAddress,
          data: web3.utils.sha3('totalSupply()').substring(0, 10)
        }).then(() => true).catch(() => false);
        
        const isERC721 = await web3.eth.call({
          to: proxyAddress,
          data: web3.utils.sha3('balanceOf(address)').substring(0, 10) + '0'.padStart(64, '0')
        }).then(() => !isERC20).catch(() => false);
        
        if (isERC20) proxyType = 'ERC20 ';
        else if (isERC721) proxyType = 'ERC721 ';
      } catch (error) {
        // Ignore detection errors
      }
      
      mermaidCode += `    Proxy_${proxyAddress.substring(2, 8)}["${proxyType}Proxy ${shortAddr}"] --> Admin_${info.admin.substring(2, 8)}\n`;
      mermaidCode += `    style Proxy_${proxyAddress.substring(2, 8)} fill:${adminColor},stroke:#333,stroke-width:1px\n`;
      
      // Also connect to implementation
      const implAddr = info.implementation;
      const shortImplAddr = implAddr.substring(0, 6) + '...' + implAddr.substring(38);
      
      // Check if implementation node already exists
      if (!mermaidCode.includes(`Impl_${implAddr.substring(2, 8)}`)) {
        mermaidCode += `    Impl_${implAddr.substring(2, 8)}["Implementation ${shortImplAddr}"]\n`;
        mermaidCode += `    style Impl_${implAddr.substring(2, 8)} fill:#f9f9f9,stroke:#666,stroke-width:1px\n`;
      }
      
      mermaidCode += `    Proxy_${proxyAddress.substring(2, 8)} -.-> Impl_${implAddr.substring(2, 8)}\n`;
    }
    
    // Add legend
    mermaidCode += `    subgraph Legend\n`;
    mermaidCode += `        LegendAdmin["Admin Contract"] --> LegendProxy["Proxy Contract"]\n`;
    mermaidCode += `        LegendProxy -.-> LegendImpl["Implementation Contract"]\n`;
    mermaidCode += `    end\n`;
    
    // Save the Mermaid code to a file
    const diagramPath = path.join(__dirname, '..', 'proxy_admin_diagram.mmd');
    fs.writeFileSync(diagramPath, mermaidCode);
    console.log(`\nMermaid diagram saved to ${diagramPath}`);
    
    // Also log to console
    console.log('\nMermaid Diagram Code:');
    console.log(mermaidCode);
    
    // Generate summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total proxies analyzed: ${PROXY_ADDRESSES.length}`);
    console.log(`Total unique admin contracts: ${Object.keys(data.admins).length}`);
    console.log(`Total unique implementations: ${data.implementations.size}`);
    
    console.log('\nAdmin contracts by bytecode:');
    for (const [hash, admins] of Object.entries(adminsByBytecode)) {
      console.log(`- Bytecode ${hash.substring(0, 8)}...${hash.substring(58)}: ${admins.length} admin contracts`);
    }
    
    callback();
  } catch (error) {
    console.error('Error generating diagram:', error);
    callback(error);
  }
};
