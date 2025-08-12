#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Shuttle Application Setup Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if scripts exist
if [ ! -f "./install-all.sh" ] || [ ! -f "./build-all.sh" ] || [ ! -f "./start-all.sh" ]; then
    echo -e "${RED}❌ Required scripts not found!${NC}"
    echo "Please make sure install-all.sh, build-all.sh, and start-all.sh exist in the current directory."
    exit 1
fi

# Make scripts executable
chmod +x ./install-all.sh
chmod +x ./build-all.sh
chmod +x ./start-all.sh
chmod +x ./stop-all.sh

echo -e "${GREEN}✅ Scripts made executable${NC}"
echo ""

# Ask user what they want to do
echo -e "${BLUE}What would you like to do?${NC}"
echo "1) Install dependencies only"
echo "2) Build applications only"
echo "3) Start applications only"
echo "4) Install + Build + Start (Full setup)"
echo "5) Stop all applications"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo -e "${BLUE}📦 Installing dependencies...${NC}"
        ./install-all.sh
        ;;
    2)
        echo -e "${BLUE}🏗️  Building applications...${NC}"
        ./build-all.sh
        ;;
    3)
        echo -e "${BLUE}🚀 Starting applications...${NC}"
        ./start-all.sh
        ;;
    4)
        echo -e "${BLUE}🔄 Running full setup...${NC}"
        echo ""
        
        echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
        if ./install-all.sh; then
            echo ""
            echo -e "${YELLOW}Step 2: Building applications...${NC}"
            if ./build-all.sh; then
                echo ""
                echo -e "${YELLOW}Step 3: Starting applications...${NC}"
                ./start-all.sh
            else
                echo -e "${RED}❌ Build failed. Please check the errors above.${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Installation failed. Please check the errors above.${NC}"
            exit 1
        fi
        ;;
    5)
        echo -e "${BLUE}🛑 Stopping all applications...${NC}"
        ./stop-all.sh
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac
