#!/usr/bin/env bash

# Run the complete test workflow
echo "Running test workflow..."
npx truffle exec scripts/complete-test-workflow.js --network development | tee run_output.txt

# Extract proxy and admin addresses from the output
echo "\nExtracting proxy and admin addresses..."
FIRST_PROXY=$(grep "First proxy deployed at:" run_output.txt | awk '{print $NF}')
SECOND_PROXY=$(grep "Second proxy deployed at:" run_output.txt | awk '{print $NF}')
FIRST_ADMIN=$(grep "First ProxyAdmin deployed at:" run_output.txt | awk '{print $NF}')
SECOND_ADMIN=$(grep "Second ProxyAdmin deployed at:" run_output.txt | awk '{print $NF}')

echo "First Proxy: $FIRST_PROXY"
echo "Second Proxy: $SECOND_PROXY"
echo "First Admin: $FIRST_ADMIN"
echo "Second Admin: $SECOND_ADMIN"

# Run the dump script to visualize proxy admin relationships
echo "\nGenerating proxy admin visualization..."

# Check if we have the addresses
if [ -n "$FIRST_PROXY" ] && [ -n "$SECOND_PROXY" ] && [ -n "$FIRST_ADMIN" ] && [ -n "$SECOND_ADMIN" ]; then
  echo "Using extracted addresses from test workflow"
  npx truffle exec scripts/dump.js --network development --proxy $FIRST_PROXY --proxy $SECOND_PROXY --admin $FIRST_ADMIN --admin $SECOND_ADMIN
else
  echo "Could not extract addresses, using default values"
  npx truffle exec scripts/dump.js --network development
fi
