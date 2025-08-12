#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting installation for all Shuttle applications...${NC}"
echo ""

# Function to install dependencies for a specific app
install_app() {
    local app_name=$1
    local app_dir=$2
    
    echo -e "${YELLOW}📦 Installing dependencies for ${app_name}...${NC}"
    cd "../$app_dir"
    
    if npm install --force --legacy-peer-deps; then
        echo -e "${GREEN}✅ ${app_name} dependencies installed successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to install dependencies for ${app_name}${NC}"
        return 1
    fi
    
    cd ../shell
}

# Start all installations in parallel
echo -e "${BLUE}Installing dependencies for all applications in parallel...${NC}"

# Install admin dependencies
install_app "Admin" "admin" &
ADMIN_PID=$!

# Install driver dependencies  
install_app "Driver" "driver" &
DRIVER_PID=$!

# Install frontdesk dependencies
install_app "Frontdesk" "frontdesk" &
FRONTDESK_PID=$!

# Install guest dependencies
install_app "Guest" "guest" &
GUEST_PID=$!

# Install super-admin dependencies
install_app "Super Admin" "super-admin" &
SUPER_ADMIN_PID=$!

# Install server dependencies
install_app "Server" "server" &
SERVER_PID=$!

# Wait for all installations to complete
echo -e "${BLUE}⏳ Waiting for all installations to complete...${NC}"
echo ""

wait $ADMIN_PID
ADMIN_RESULT=$?

wait $DRIVER_PID
DRIVER_RESULT=$?

wait $FRONTDESK_PID
FRONTDESK_RESULT=$?

wait $GUEST_PID
GUEST_RESULT=$?

wait $SUPER_ADMIN_PID
SUPER_ADMIN_RESULT=$?

wait $SERVER_PID
SERVER_RESULT=$?

echo ""
echo -e "${BLUE}📊 Installation Results:${NC}"
echo ""

# Check results
if [ $ADMIN_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Admin: Success${NC}"
else
    echo -e "${RED}❌ Admin: Failed${NC}"
fi

if [ $DRIVER_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Driver: Success${NC}"
else
    echo -e "${RED}❌ Driver: Failed${NC}"
fi

if [ $FRONTDESK_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Frontdesk: Success${NC}"
else
    echo -e "${RED}❌ Frontdesk: Failed${NC}"
fi

if [ $GUEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Guest: Success${NC}"
else
    echo -e "${RED}❌ Guest: Failed${NC}"
fi

if [ $SUPER_ADMIN_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Super Admin: Success${NC}"
else
    echo -e "${RED}❌ Super Admin: Failed${NC}"
fi

if [ $SERVER_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Server: Success${NC}"
else
    echo -e "${RED}❌ Server: Failed${NC}"
fi

echo ""
# Check if all installations were successful
if [ $ADMIN_RESULT -eq 0 ] && [ $DRIVER_RESULT -eq 0 ] && [ $FRONTDESK_RESULT -eq 0 ] && [ $GUEST_RESULT -eq 0 ] && [ $SUPER_ADMIN_RESULT -eq 0 ] && [ $SERVER_RESULT -eq 0 ]; then
    echo -e "${GREEN}🎉 All installations completed successfully!${NC}"
    echo -e "${BLUE}You can now run the build script: ./build-all.sh${NC}"
else
    echo -e "${RED}⚠️  Some installations failed. Please check the errors above.${NC}"
fi
