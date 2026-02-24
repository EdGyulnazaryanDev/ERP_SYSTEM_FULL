#!/bin/bash

echo "Starting Frontend Dev Server..."
echo "==============================="
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting Vite dev server on port 5173..."
npm run dev
