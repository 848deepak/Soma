#!/bin/bash

echo "Installing Node.js using Homebrew..."

# Check if brew is available
if command -v brew &> /dev/null; then
    echo "Homebrew found, installing Node.js..."
    brew install node
else
    echo "Homebrew not found, trying to install via curl..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Verify installation
if command -v node &> /dev/null; then
    echo "Node.js installed successfully!"
    echo "Node version: $(node --version)"
    echo "npm version: $(npm --version)"
else
    echo "Node.js installation failed"
fi