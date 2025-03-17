#!/bin/bash
# analyze-blockchain.sh - Script to analyze proxy contracts on an existing blockchain
# Usage: ./analyze-blockchain.sh <network> <proxy1> <proxy2> ... [--admin <admin>]

# Check if at least network and one proxy are provided
if [ $# -lt 2 ]; then
  echo "Usage: $0 <network> <proxy1> <proxy2> ... [--admin <admin>]"
  echo "Example: $0 mainnet 0x1234... 0x5678... --admin 0xabcd..."
  exit 1
fi

# Extract network from arguments
NETWORK=$1
shift

# Process remaining arguments to extract proxies and admins
PROXY_ARGS=""
ADMIN_ARGS=""

while [ $# -gt 0 ]; do
  if [ "$1" == "--admin" ]; then
    if [ $# -gt 1 ]; then
      ADMIN_ARGS="$ADMIN_ARGS --admin $2"
      shift 2
    else
      echo "Error: --admin requires an address"
      exit 1
    fi
  else
    PROXY_ARGS="$PROXY_ARGS --proxy $1"
    shift
  fi
done

echo "Analyzing proxies on $NETWORK network..."
echo "Proxy addresses: $PROXY_ARGS"
if [ -n "$ADMIN_ARGS" ]; then
  echo "Admin addresses: $ADMIN_ARGS"
fi

# Run the dump.js script with the provided arguments
npx truffle exec scripts/dump.js --network $NETWORK $PROXY_ARGS $ADMIN_ARGS

# Check if the diagram was generated
if [ -f "proxy_admin_diagram.mmd" ]; then
  echo "Mermaid diagram generated successfully at proxy_admin_diagram.mmd"
  
  # If mmdc (Mermaid CLI) is installed, generate an image
  if command -v mmdc &> /dev/null; then
    echo "Generating PNG image from Mermaid diagram..."
    mmdc -i proxy_admin_diagram.mmd -o proxy_admin_diagram.png -t neutral
    echo "PNG image generated at proxy_admin_diagram.png"
  else
    echo "Tip: Install Mermaid CLI to generate PNG images from the diagram"
    echo "npm install -g @mermaid-js/mermaid-cli"
  fi
  
  # Suggest online Mermaid viewer
  echo "You can also view the diagram online at https://mermaid.live by pasting the contents of proxy_admin_diagram.mmd"
else
  echo "Error: Failed to generate Mermaid diagram"
fi
