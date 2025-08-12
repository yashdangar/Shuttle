#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping all Shuttle applications...${NC}"
echo ""

# Function to stop processes by PID file
stop_by_pid_file() {
    local app_name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        echo -e "${YELLOW}Stopping ${app_name} (PID: $pid)...${NC}"
        
        if kill $pid 2>/dev/null; then
            echo -e "${GREEN}✅ ${app_name} stopped successfully${NC}"
        else
            echo -e "${RED}❌ Failed to stop ${app_name}${NC}"
        fi
        
        rm "$pid_file"
    else
        echo -e "${YELLOW}⚠️  No PID file found for ${app_name}${NC}"
    fi
}

# Stop all applications
echo -e "${BLUE}Stopping all applications...${NC}"

# Stop by PID files (if they exist)
stop_by_pid_file "Admin" "admin.pid"
stop_by_pid_file "Driver" "driver.pid"
stop_by_pid_file "Frontdesk" "frontdesk.pid"
stop_by_pid_file "Guest" "guest.pid"
stop_by_pid_file "Super Admin" "super-admin.pid"
stop_by_pid_file "Server" "server.pid"

# Also kill any remaining Node.js processes on the specific ports
echo ""
echo -e "${BLUE}Killing any remaining processes on application ports...${NC}"

# Kill processes on specific ports
for port in 3000 3001 3002 3003 3004 8080; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)...${NC}"
        kill $pid 2>/dev/null
        echo -e "${GREEN}✅ Process on port $port stopped${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 All applications stopped!${NC}"
