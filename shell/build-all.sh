#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏗️  Starting build process for all Shuttle applications...${NC}"
echo ""

# Function to build a specific app
build_app() {
    local app_name=$1
    local app_dir=$2
    
    echo -e "${YELLOW}🔨 Building ${app_name}...${NC}"
    cd "../$app_dir"
    
    if npm run build; then
        echo -e "${GREEN}✅ ${app_name} built successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to build ${app_name}${NC}"
        return 1
    fi
    
    cd ../shell
}

# Start all builds in parallel
echo -e "${BLUE}Building all applications in parallel...${NC}"

# Build admin
build_app "Admin" "admin" &
ADMIN_PID=$!

# Build driver  
build_app "Driver" "driver" &
DRIVER_PID=$!

# Build frontdesk
build_app "Frontdesk" "frontdesk" &
FRONTDESK_PID=$!

# Build guest
build_app "Guest" "guest" &
GUEST_PID=$!

# Build super-admin
build_app "Super Admin" "super-admin" &
SUPER_ADMIN_PID=$!

# Build server
build_app "Server" "server" &
SERVER_PID=$!

# Wait for all builds to complete
echo -e "${BLUE}⏳ Waiting for all builds to complete...${NC}"
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
echo -e "${BLUE}📊 Build Results:${NC}"
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
# Check if all builds were successful
if [ $ADMIN_RESULT -eq 0 ] && [ $DRIVER_RESULT -eq 0 ] && [ $FRONTDESK_RESULT -eq 0 ] && [ $GUEST_RESULT -eq 0 ] && [ $SUPER_ADMIN_RESULT -eq 0 ] && [ $SERVER_RESULT -eq 0 ]; then
    echo -e "${GREEN}🎉 All builds completed successfully!${NC}"
    echo -e "${BLUE}You can now run the start script: ./start-all.sh${NC}"
else
    echo -e "${RED}⚠️  Some builds failed. Please check the errors above.${NC}"
fi
