#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting all Shuttle applications...${NC}"
echo ""

# Function to start a specific app
start_app() {
    local app_name=$1
    local app_dir=$2
    local port=$3
    local color=$4
    
    echo -e "${color}🌐 Starting ${app_name} on port ${port}...${NC}"
    cd "../$app_dir"
    
    # Start the app in background
    npm start > "${app_name,,}-output.log" 2>&1 &
    local pid=$!
    
    # Store PID for later cleanup
    echo $pid > "../shell/${app_name,,}.pid"
    
    echo -e "${color}✅ ${app_name} started with PID: $pid${NC}"
    cd ../shell
    
    return $pid
}

# Function to start server (different command)
start_server() {
    local app_name="Server"
    local app_dir="server"
    local port="5000"
    local color=$CYAN
    
    echo -e "${color}🌐 Starting ${app_name} on port ${port}...${NC}"
    cd "../$app_dir"
    
    # Start the server in background
    npm start > "server-output.log" 2>&1 &
    local pid=$!
    
    # Store PID for later cleanup
    echo $pid > "../shell/server.pid"
    
    echo -e "${color}✅ ${app_name} started with PID: $pid${NC}"
    cd ../shell
    
    return $pid
}

# Start all applications in parallel
echo -e "${BLUE}Starting all applications in parallel...${NC}"

# Start admin (port 3003)
start_app "Admin" "admin" "3003" $GREEN &
ADMIN_PID=$!

# Start driver (port 3001)
start_app "Driver" "driver" "3001" $YELLOW &
DRIVER_PID=$!

# Start frontdesk (port 3002)
start_app "Frontdesk" "frontdesk" "3002" $PURPLE &
FRONTDESK_PID=$!

# Start guest (port 3000)
start_app "Guest" "guest" "3000" $BLUE &
GUEST_PID=$!

# Start super-admin (port 3004)
start_app "Super Admin" "super-admin" "3004" $RED &
SUPER_ADMIN_PID=$!

# Start server (port 5000)
start_server &
SERVER_PID=$!

# Wait a moment for all apps to start
echo ""
echo -e "${BLUE}⏳ Waiting for applications to start...${NC}"
sleep 5

echo ""
echo -e "${GREEN}🎉 All applications started!${NC}"
echo ""
echo -e "${BLUE}📱 Application URLs:${NC}"
echo -e "${GREEN}   • Guest App:     http://localhost:3000${NC}"
echo -e "${YELLOW}   • Driver App:    http://localhost:3001${NC}"
echo -e "${PURPLE}   • Frontdesk App: http://localhost:3002${NC}"
echo -e "${GREEN}   • Admin App:      http://localhost:3003${NC}"
echo -e "${RED}   • Super Admin:     http://localhost:3004${NC}"
echo -e "${CYAN}   • Server API:      http://localhost:5000${NC}"
echo ""
echo -e "${BLUE}📋 To stop all applications, run: ./stop-all.sh${NC}"
echo -e "${BLUE}📋 To view logs, check the .log files in each directory${NC}"
echo ""

# Keep the script running and show status
echo -e "${BLUE}🔄 Applications are running. Press Ctrl+C to stop all applications.${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping all applications...${NC}"
    
    # Kill all stored PIDs
    for pid_file in *.pid; do
        if [ -f "$pid_file" ]; then
            pid=$(cat "$pid_file")
            echo -e "${YELLOW}Stopping process $pid...${NC}"
            kill $pid 2>/dev/null
            rm "$pid_file"
        fi
    done
    
    echo -e "${GREEN}✅ All applications stopped.${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep the script running
while true; do
    sleep 1
done
