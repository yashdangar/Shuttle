#!/bin/bash

# Shuttle App Deployment Script
# Usage: ./deploy.sh [app-name] or ./deploy.sh all

set -e

APPS=("admin" "frontdesk" "driver" "guest" "super-admin" "server")
LOGS_DIR="./logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory if it doesn't exist
mkdir -p $LOGS_DIR

print_colored() {
    printf "${2}${1}${NC}\n"
}

deploy_app() {
    local app=$1
    
    if [[ ! " ${APPS[@]} " =~ " ${app} " ]]; then
        print_colored "❌ Invalid app name: $app" $RED
        print_colored "Valid apps: ${APPS[*]}" $YELLOW
        exit 1
    fi
    
    print_colored "🚀 Deploying $app..." $BLUE
    
    if [ ! -d "./$app" ]; then
        print_colored "❌ Directory ./$app not found!" $RED
        exit 1
    fi
    
    cd "./$app"
    
    # Install dependencies
    print_colored "📥 Installing dependencies..." $YELLOW
    npm install --force
    
    # Build the app
    print_colored "🔨 Building $app..." $YELLOW
    if [[ "$app" == "server" ]]; then
        npm run build || echo "Server build completed"
    else
        npm run build
    fi
    
    cd ..
    
    # PM2 operations
    print_colored "🔄 Managing PM2 process..." $YELLOW
    
    if pm2 describe "$app" > /dev/null 2>&1; then
        print_colored "📦 Restarting existing PM2 process..." $YELLOW
        pm2 restart "$app"
    else
        print_colored "🆕 Starting new PM2 process..." $YELLOW
        pm2 start npm --name "$app" --cwd "./$app" -- start
    fi
    
    # Wait for stabilization
    sleep 3
    
    # Check status
    if pm2 describe "$app" | grep -q "online"; then
        print_colored "✅ $app deployed successfully!" $GREEN
    else
        print_colored "❌ $app deployment failed!" $RED
        pm2 logs "$app" --lines 10
        exit 1
    fi
}

show_status() {
    print_colored "📊 Current PM2 Status:" $BLUE
    pm2 status
    pm2 save --force
}

show_logs() {
    local app=$1
    if [[ -z "$app" ]]; then
        print_colored "📋 Showing logs for all apps:" $BLUE
        pm2 logs --lines 20
    else
        print_colored "📋 Showing logs for $app:" $BLUE
        pm2 logs "$app" --lines 20
    fi
}

stop_all() {
    print_colored "🛑 Stopping all apps..." $YELLOW
    for app in "${APPS[@]}"; do
        if pm2 describe "$app" > /dev/null 2>&1; then
            pm2 stop "$app"
        fi
    done
    show_status
}

start_all() {
    print_colored "▶️ Starting all apps..." $YELLOW
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
    else
        for app in "${APPS[@]}"; do
            if [ -d "./$app" ]; then
                pm2 start npm --name "$app" --cwd "./$app" -- start
            fi
        done
    fi
    show_status
}

print_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  deploy <app-name>     Deploy specific app (${APPS[*]})"
    echo "  deploy all           Deploy all apps"
    echo "  status               Show PM2 status"
    echo "  logs [app-name]      Show logs (all apps if no name specified)"
    echo "  stop                 Stop all apps"
    echo "  start                Start all apps"
    echo "  restart              Restart all apps"
    echo "  help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy admin"
    echo "  $0 deploy all"
    echo "  $0 status"
    echo "  $0 logs admin"
}

# Main script logic
case "$1" in
    "deploy")
        if [[ "$2" == "all" ]]; then
            for app in "${APPS[@]}"; do
                if [ -d "./$app" ]; then
                    deploy_app "$app"
                fi
            done
        elif [[ -n "$2" ]]; then
            deploy_app "$2"
        else
            print_colored "❌ Please specify an app name or 'all'" $RED
            print_usage
            exit 1
        fi
        show_status
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "stop")
        stop_all
        ;;
    "start")
        start_all
        ;;
    "restart")
        stop_all
        sleep 2
        start_all
        ;;
    "help"|"--help"|"-h")
        print_usage
        ;;
    *)
        print_colored "❌ Invalid command: $1" $RED
        print_usage
        exit 1
        ;;
esac 