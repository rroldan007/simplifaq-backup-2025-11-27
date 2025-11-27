#!/bin/bash

# Stop any running Node.js processes
echo "Stopping any running Node.js processes..."
pkill -f "node.*backend" || true

# Navigate to the backend directory
cd "$(dirname "$0")/backend"

# Set environment variables
export PORT=3001
export NODE_ENV=development
export FRONTEND_URL=http://localhost:5173
export DATABASE_URL="postgresql://simplifaq_dev:simplifaq_dev@localhost:5433/simplifaq_dev"
export JWT_SECRET=dev-secret-key-123
export JWT_EXPIRES_IN=7d
export JWT_REFRESH_SECRET=dev-refresh-secret-123
export JWT_REFRESH_EXPIRES_IN=30d

# Create uploads directory if it doesn't exist
mkdir -p uploads/logos

# Start the server with debug logging
echo "Starting the server..."
DEBUG=* npx ts-node src/index.ts
