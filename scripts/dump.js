// scripts/generate_proxy_admin_diagram.js
const fs = require('fs');
const path = require('path');

// Function to find proxy addresses and expected admins from OpenZeppelin files or from the command line
const findProxyAddressesAndAdmins = () => {
  const proxyAddresses = [];
  const admins = new Set();
  const expectedAdminMap = {}; // Map of proxy address to expected admin from OpenZeppelin files
  let useExpectedAdmin = false;
  
  // Check if proxy addresses were passed as command line arguments
  const args = process.argv.slice(4); // Skip node, script, and network args
  const cmdProxies = [];
  const cmdAdmins = [];
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--proxy' && i + 1 < args.length) {
      cmdProxies.push(args[i + 1]);
      i++;
    } else if (args[i] === '--admin' && i + 1 < args.length) {
      cmdAdmins.push(args[i + 1]);
      i++;
    } else if (args[i] === '--expected-admin') {
      useExpectedAdmin = true;
    }
  }
  
  // If proxies were specified via command line, use them
  if (cmdProxies.length > 0) {
    console.log(`Using ${cmdProxies.length} proxies from command line arguments`);
    proxyAddresses.push(...cmdProxies);
  }
  
  // If admins were specified via command line, use them
  if (cmdAdmins.length > 0) {
    console.log(`Using ${cmdAdmins.length} admins from command line arguments`);
    cmdAdmins.forEach(admin => admins.add(admin));
    if (cmdAdmins.length > 0) {
      MAIN_ADMIN = cmdAdmins[0]; // Set the first admin as main
    }
  }
  
  // Try to read from OpenZeppelin files to get expected admin relationships
  try {
    const networkId = web3.networkVersion;
    const openzeppelinDir = path.join(__dirname, '..', '.openzeppelin');
    
    // Check if .openzeppelin directory exists
    if (fs.existsSync(openzeppelinDir)) {
      // Read all files in the .openzeppelin directory
      const files = fs.readdirSync(openzeppelinDir);
      
      // If we're specifically looking for expected admin relationships, prioritize the unknown file
      if (useExpectedAdmin && files.includes(`unknown-${networkId}.json`)) {
        console.log('Using expected admin relationships from unknown file');
        const filePath = path.join(openzeppelinDir, `unknown-${networkId}.json`);
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(fileContent);
          
          if (data.admin && data.admin.address) {
            const expectedAdmin = data.admin.address.toLowerCase();
            console.log(`Expected admin from OpenZeppelin: ${expectedAdmin}`);
            
            // Map all proxies to this expected admin
            if (data.proxies && Array.isArray(data.proxies)) {
              for (const proxy of data.proxies) {
                if (proxy.address) {
                  expectedAdminMap[proxy.address.toLowerCase()] = expectedAdmin;
                  console.log(`Proxy ${proxy.address} is expected to have admin ${expectedAdmin}`);
                  
                  // Also add to proxy addresses if not already there
                  if (proxyAddresses.length === 0 || !proxyAddresses.includes(proxy.address)) {
                    proxyAddresses.push(proxy.address);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.log(`Could not read unknown file: ${error.message}`);
        }
      }
      
      // Filter for network files and our special expected-admins file
      const networkFiles = files.filter(file => 
        file.includes(`-${networkId}.json`) || file === `expected-admins-${networkId}.json`
      );
      
      for (const file of networkFiles) {
        try {
          const filePath = path.join(openzeppelinDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(fileContent);
          
          // Extract proxy addresses and expected admin relationships
          if (data.proxies && Array.isArray(data.proxies)) {
            for (const proxy of data.proxies) {
              if (proxy.address) {
                if (proxyAddresses.length === 0 || !proxyAddresses.includes(proxy.address)) {
                  proxyAddresses.push(proxy.address);
                }
                
                // Store the expected admin for this proxy
                if (data.admin) {
                  expectedAdminMap[proxy.address.toLowerCase()] = data.admin.toLowerCase();
                }
              }
            }
          }
          
          // Store the admin address if available
          if (data.admin) {
            admins.add(data.admin);
            // Use the most recent admin file as the main admin
            MAIN_ADMIN = data.admin;
          }
        } catch (error) {
          console.log(`Note: Could not read file ${file}: ${error.message}`);
        }
      }
      
      if (proxyAddresses.length > 0 && Object.keys(expectedAdminMap).length > 0) {
        console.log(`Found ${proxyAddresses.length} proxies and ${Object.keys(expectedAdminMap).length} expected admin relationships from OpenZeppelin files`);
      }
    } else {
      console.log('Note: .openzeppelin directory not found');
    }
  } catch (error) {
    console.log(`Note: ${error.message}`);
  }
  
  // Add all found admins to the CORRECT_ADMINS list
  admins.forEach(admin => {
    if (admin && admin.toLowerCase() !== MAIN_ADMIN.toLowerCase()) {
      CORRECT_ADMINS.push(admin.toLowerCase());
    }
  });
  
  return { proxyAddresses, expectedAdminMap };
};

// List of proxy addresses to analyze
// Will be populated dynamically or fallback to hardcoded values
let PROXY_ADDRESSES = [
  '0x547325fDCF5EF2cC0A1d78b95727bF4417581eC0',
  '0x80efcdE4313326B4F350abA8c7918ABdaC7448e3'
  // Add any default proxies here as fallback
];

// Your expected main admin (optional)
let MAIN_ADMIN = '0x04Ac0143BCd5efd7f9f77099Eb7dDf34448BE003';

// List of known correct admin addresses
const CORRECT_ADMINS = [
  MAIN_ADMIN.toLowerCase()
  // Add any other known correct admin addresses here
];

module.exports = async function(callback) {
  try {
    console.log('Analyzing proxy and admin relationships...');
    
    // Try to find proxy addresses and expected admin relationships dynamically
    const { proxyAddresses, expectedAdminMap } = findProxyAddressesAndAdmins();
    if (proxyAddresses.length > 0) {
      PROXY_ADDRESSES = proxyAddresses;
    } else {
      console.log('Using default proxy addresses');
    }
    
    // Store the expected admin map for later comparison
    const EXPECTED_ADMINS = expectedAdminMap;
    
    // Update CORRECT_ADMINS with the MAIN_ADMIN
    CORRECT_ADMINS[0] = MAIN_ADMIN.toLowerCase();
    
    console.log(`Main admin: ${MAIN_ADMIN}`);
    console.log(`Proxy addresses to analyze: ${PROXY_ADDRESSES.join(', ')}`);
    console.log(`Correct admins: ${CORRECT_ADMINS.join(', ')}`);
    console.log('');
    
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
      
      // Check if there's a mismatch between expected and actual admin
      const proxyAddressLower = proxyAddress.toLowerCase();
      let hasMismatch = false;
      let expectedAdmin = null;
      
      if (EXPECTED_ADMINS && EXPECTED_ADMINS[proxyAddressLower]) {
        expectedAdmin = EXPECTED_ADMINS[proxyAddressLower];
        if (expectedAdmin !== adminAddress) {
          hasMismatch = true;
          console.log(`  ⚠️ MISMATCH: OpenZeppelin expects admin ${expectedAdmin} but actual admin is ${adminAddress}`);
          console.log(`  ⚠️ This proxy will not be upgradable directly by the OpenZeppelin plugin!`);
        }
      }
      
      // Store in our data structure
      data.proxies[proxyAddressLower] = {
        admin: adminAddress,
        implementation: implementationAddress,
        expectedAdmin: expectedAdmin,
        hasMismatch: hasMismatch
      };
      
      // Track admins
      if (!data.admins[adminAddress]) {
        data.admins[adminAddress] = {
          proxies: [],
          bytecodeHash: null
        };
      }
      data.admins[adminAddress].proxies.push(proxyAddressLower);
      
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
    
    // Define specific colors for correct and erroneous admins
    const CORRECT_ADMIN_COLOR = "#2ca02c"; // Green
    const ERRONEOUS_ADMIN_COLOR = "#d62728"; // Red
    
    // Counter for link styles in the Mermaid diagram
    let linkStyleCounter = 0;
    
    const adminColors = {};
    let colorIndex = 0;
    
    // First assign colors to admins grouped by bytecode
    for (const hash of Object.keys(adminsByBytecode)) {
      const hashColor = colors[colorIndex % colors.length];
      colorIndex++;
      
      for (const admin of adminsByBytecode[hash]) {
        // Use special colors for correct/erroneous admins
        if (CORRECT_ADMINS.includes(admin.toLowerCase())) {
          adminColors[admin] = CORRECT_ADMIN_COLOR;
        } else {
          adminColors[admin] = ERRONEOUS_ADMIN_COLOR;
        }
      }
    }
    
    // Generate Mermaid diagram with correct syntax
    let mermaidCode = 'graph TD\n';
    
    // Add nodes for admins with the correct syntax
    for (const [adminAddress, info] of Object.entries(data.admins)) {
      const shortAddr = adminAddress.substring(0, 6) + '...' + adminAddress.substring(38);
      const color = adminColors[adminAddress] || "#999999";
      const isMainAdmin = adminAddress.toLowerCase() === MAIN_ADMIN?.toLowerCase();
      const isCorrectAdmin = CORRECT_ADMINS.includes(adminAddress.toLowerCase());
      
      const proxiesCount = info.proxies.length;
      let label;
      if (isMainAdmin) {
        label = `Admin ${shortAddr}\\nMain Admin (Correct)\\n(${proxiesCount} proxies)`;
      } else if (isCorrectAdmin) {
        label = `Admin ${shortAddr}\\nCorrect Admin\\n(${proxiesCount} proxies)`;
      } else {
        label = `Admin ${shortAddr}\\nERRONEOUS Admin\\n(${proxiesCount} proxies)`;
      }
      
      // Node definition and styling on separate lines
      mermaidCode += `    Admin_${adminAddress.substring(2, 8)}["${label}"]\n`;
      mermaidCode += `    style Admin_${adminAddress.substring(2, 8)} fill:${color},stroke:#333,stroke-width:2px`;
      
      if (isMainAdmin || isCorrectAdmin) {
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
      
      // Add special label for mismatched proxies
      let proxyLabel;
      if (info.hasMismatch && info.expectedAdmin) {
        const expectedShort = info.expectedAdmin.substring(0, 6) + '...' + info.expectedAdmin.substring(38);
        proxyLabel = `${proxyType}Proxy ${shortAddr}\n⚠️ Expected admin: ${expectedShort}\n⚠️ Not upgradable by plugin!`;
        
        // Use a special style for proxies with mismatched admin
        mermaidCode.push(`    style ${proxyId} fill:#ff7f0e,stroke:#333,stroke-width:2px,stroke-dasharray: 3 3`);
        
        // Add a dashed red line showing the expected admin relationship
        const expectedAdminId = `Admin_${info.expectedAdmin.substring(0, 6)}`;
        mermaidCode.push(`    ${proxyId} -. Expected .-> ${expectedAdminId}`);
        mermaidCode.push(`    linkStyle ${linkStyleCounter} stroke:red,stroke-width:1.5px,stroke-dasharray: 5 5`);
        linkStyleCounter++;
      } else {
        proxyLabel = `${proxyType}Proxy ${shortAddr}`;
      }
      
      mermaidCode += `    Proxy_${proxyAddress.substring(2, 8)}["${proxyLabel}"] --> Admin_${info.admin.substring(2, 8)}\n`;
      
      // Style proxy based on admin type and mismatch status
      if (info.hasMismatch) {
        // Use a special style for mismatched proxies (orange color)
        mermaidCode += `    style Proxy_${proxyAddress.substring(2, 8)} fill:#ff7f0e,stroke:#333,stroke-width:2px,stroke-dasharray: 3 3\n`;
      } else {
        mermaidCode += `    style Proxy_${proxyAddress.substring(2, 8)} fill:${adminColor},stroke:#333,stroke-width:1px\n`;
      }
      
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
    
    // Add legend with the correct format
    mermaidCode += `    subgraph Legend\n`;
    mermaidCode += `        LegendCorrectAdmin["Correct Admin Contract"]\n`;
    mermaidCode += `        style LegendCorrectAdmin fill:${CORRECT_ADMIN_COLOR},stroke:#333,stroke-width:2px,stroke-dasharray: 5 5\n`;
    mermaidCode += `        LegendErrAdmin["Erroneous Admin Contract"]\n`;
    mermaidCode += `        style LegendErrAdmin fill:${ERRONEOUS_ADMIN_COLOR},stroke:#333,stroke-width:2px\n`;
    mermaidCode += `        LegendMismatchProxy["Proxy with Admin Mismatch"]\n`;
    mermaidCode += `        style LegendMismatchProxy fill:#ff7f0e,stroke:#333,stroke-width:2px,stroke-dasharray: 3 3\n`;
    mermaidCode += `        LegendProxy["Proxy Contract"]\n`;
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
    
    // Count correct and erroneous admins
    const correctAdmins = Object.keys(data.admins).filter(admin => 
      CORRECT_ADMINS.includes(admin.toLowerCase())
    );
    const erroneousAdmins = Object.keys(data.admins).filter(admin => 
      !CORRECT_ADMINS.includes(admin.toLowerCase())
    );
    
    console.log('\nAdmin status:');
    console.log(`- Correct admins: ${correctAdmins.length}`);
    console.log(`- Erroneous admins: ${erroneousAdmins.length}`);
    
    console.log('\nCorrect admin addresses:');
    correctAdmins.forEach(admin => {
      const proxyCount = data.admins[admin].proxies.length;
      console.log(`- ${admin} (managing ${proxyCount} proxies)`);
    });
    
    console.log('\nErroneous admin addresses:');
    erroneousAdmins.forEach(admin => {
      const proxyCount = data.admins[admin].proxies.length;
      console.log(`- ${admin} (managing ${proxyCount} proxies)`);
    });
    
    // Count and report admin mismatches
    const mismatchedProxies = Object.entries(data.proxies).filter(([_, info]) => info.hasMismatch);
    if (mismatchedProxies.length > 0) {
      console.log('\n⚠️ Admin mismatches detected:');
      for (const [proxyAddr, info] of mismatchedProxies) {
        console.log(`- Proxy ${proxyAddr}:`);
        console.log(`  Expected admin (OpenZeppelin): ${info.expectedAdmin}`);
        console.log(`  Actual admin (on-chain): ${info.admin}`);
      }
    }
    
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
