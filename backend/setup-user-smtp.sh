#!/bin/bash

# ===================================================================
# SimpliFaq - User SMTP Configuration Setup Script
# ===================================================================
# This script sets up the user-specific SMTP configuration system
# ===================================================================

set -e  # Exit on any error

echo "=========================================="
echo "SimpliFaq - User SMTP Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the backend directory${NC}"
    exit 1
fi

echo "Step 1: Checking prerequisites..."
echo "-----------------------------------"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

# Check Redis
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}⚠ Redis CLI not found. Please install Redis:${NC}"
    echo "  Ubuntu/Debian: sudo apt install redis-server"
    echo "  macOS: brew install redis"
    echo "  Or use Docker: docker run -d -p 6379:6379 redis"
    read -p "Press Enter to continue if Redis is running elsewhere, or Ctrl+C to abort..."
else
    # Test Redis connection
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${YELLOW}⚠ Redis CLI found but connection failed${NC}"
        echo "  Make sure Redis is running: sudo systemctl start redis"
        read -p "Press Enter to continue anyway, or Ctrl+C to abort..."
    fi
fi

# Check Prisma
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npx found${NC}"

echo ""
echo "Step 2: Checking environment variables..."
echo "-----------------------------------"

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found, creating from .env.example${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env from .env.example${NC}"
    else
        echo -e "${RED}Error: No .env.example file found${NC}"
        exit 1
    fi
fi

# Check ENCRYPTION_KEY
if ! grep -q "ENCRYPTION_KEY=" .env || [ -z "$(grep ENCRYPTION_KEY= .env | cut -d '=' -f2)" ]; then
    echo -e "${YELLOW}⚠ ENCRYPTION_KEY not found, generating one...${NC}"
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    if grep -q "^ENCRYPTION_KEY=" .env; then
        # Update existing empty key
        sed -i.bak "s/^ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
    else
        # Add new key
        echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
    fi
    echo -e "${GREEN}✓ Generated ENCRYPTION_KEY${NC}"
else
    echo -e "${GREEN}✓ ENCRYPTION_KEY already exists${NC}"
fi

# Check Redis configuration
if ! grep -q "REDIS_HOST=" .env; then
    echo "REDIS_HOST=localhost" >> .env
    echo "REDIS_PORT=6379" >> .env
    echo "REDIS_PASSWORD=" >> .env
    echo -e "${GREEN}✓ Added Redis configuration${NC}"
else
    echo -e "${GREEN}✓ Redis configuration exists${NC}"
fi

# Check FRONTEND_URL
if ! grep -q "FRONTEND_URL=" .env; then
    echo "FRONTEND_URL=http://localhost:5173" >> .env
    echo -e "${GREEN}✓ Added FRONTEND_URL${NC}"
else
    echo -e "${GREEN}✓ FRONTEND_URL exists${NC}"
fi

echo ""
echo "Step 3: Installing dependencies..."
echo "-----------------------------------"

# Check if dependencies need to be installed
NEEDS_INSTALL=false

# Check for BullMQ
if ! npm list bullmq &> /dev/null; then
    NEEDS_INSTALL=true
fi

# Check for ioredis
if ! npm list ioredis &> /dev/null; then
    NEEDS_INSTALL=true
fi

if [ "$NEEDS_INSTALL" = true ]; then
    echo "Installing required packages..."
    npm install --save bullmq ioredis
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ All dependencies already installed${NC}"
fi

echo ""
echo "Step 4: Running Prisma migration..."
echo "-----------------------------------"

# Generate Prisma client first
echo "Generating Prisma client..."
npx prisma generate

# Run migration
echo "Running database migration..."
npx prisma migrate dev --name add_user_smtp_config

echo -e "${GREEN}✓ Database migration completed${NC}"

echo ""
echo "Step 5: Verifying setup..."
echo "-----------------------------------"

# Verify tables exist
echo "Checking database tables..."
if npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM user_smtp_configs;" &> /dev/null; then
    echo -e "${GREEN}✓ user_smtp_configs table exists${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify user_smtp_configs table${NC}"
fi

if npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM user_smtp_logs;" &> /dev/null; then
    echo -e "${GREEN}✓ user_smtp_logs table exists${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify user_smtp_logs table${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ User SMTP Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start your backend server: npm run dev"
echo "2. Navigate to /settings/smtp in the frontend"
echo "3. Configure your SMTP settings"
echo "4. Send a test email to verify"
echo ""
echo "Important environment variables in .env:"
echo "  - ENCRYPTION_KEY: $(grep ENCRYPTION_KEY= .env | cut -d '=' -f2 | cut -c1-16)... (hidden)"
echo "  - REDIS_HOST: $(grep REDIS_HOST= .env | cut -d '=' -f2)"
echo "  - REDIS_PORT: $(grep REDIS_PORT= .env | cut -d '=' -f2)"
echo "  - FRONTEND_URL: $(grep FRONTEND_URL= .env | cut -d '=' -f2)"
echo ""
echo "For more information, see USER_SMTP_GUIDE.md"
echo ""
