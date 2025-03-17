#!/usr/bin/env bash

# Run the erroneous test workflow
echo "Running erroneous test workflow..."
npx truffle exec scripts/erroneous-test-workflow.js --network development | tee erroneous_output.txt

# Extract proxy and admin addresses from the output
echo "\nExtracting proxy and admin addresses..."
FIRST_PROXY=$(grep "First proxy deployed at:" erroneous_output.txt | awk '{print $NF}')
SECOND_PROXY=$(grep "Second proxy deployed at:" erroneous_output.txt | awk '{print $NF}')
FIRST_ADMIN=$(grep "First ProxyAdmin deployed at:" erroneous_output.txt | awk '{print $NF}')
SECOND_ADMIN=$(grep "Second ProxyAdmin deployed at:" erroneous_output.txt | awk '{print $NF}')

echo "First Proxy: $FIRST_PROXY"
echo "Second Proxy: $SECOND_PROXY"
echo "First Admin: $FIRST_ADMIN"
echo "Second Admin: $SECOND_ADMIN"

# Run the dump script to visualize proxy admin relationships
echo "\nGenerating proxy admin visualization..."

# Set only the second admin as correct to highlight the erroneous configuration
if [ -n "$FIRST_PROXY" ] && [ -n "$SECOND_PROXY" ] && [ -n "$FIRST_ADMIN" ] && [ -n "$SECOND_ADMIN" ]; then
  echo "Using extracted addresses from test workflow"
  
  # Create a temporary JSON file to store the expected admin relationships
  # This simulates what OpenZeppelin plugin would think
  mkdir -p .openzeppelin
  cat > .openzeppelin/unknown-5777.json << EOF
{
  "manifestVersion": "3.2",
  "admin": {
    "address": "$SECOND_ADMIN"
  },
  "proxies": [
    {
      "address": "$FIRST_PROXY",
      "kind": "transparent"
    },
    {
      "address": "$SECOND_PROXY",
      "kind": "transparent"
    }
  ]
}
EOF
  
  # Also create a backup of the file for reference
  cp .openzeppelin/unknown-5777.json .openzeppelin/expected-admins-5777.json
  
  # Pass both proxies and only the second admin as "correct"
  # The --expected-admin flag tells the script to look for expected admin relationships
  npx truffle exec scripts/dump.js --network development --proxy $FIRST_PROXY --proxy $SECOND_PROXY --admin $SECOND_ADMIN --expected-admin
else
  echo "Could not extract addresses, using default values"
  npx truffle exec scripts/dump.js --network development
fi
