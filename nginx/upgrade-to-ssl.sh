#!/bin/bash

# Upgrade nginx configuration to SSL
# Run this script after SSL certificates are installed

echo "🔒 Upgrading nginx configuration to SSL..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo"
    exit 1
fi

# Check if SSL certificates exist
echo "🔍 Checking SSL certificates..."
if [ ! -f "/etc/letsencrypt/live/mybackends.xyz/fullchain.pem" ]; then
    echo "❌ SSL certificates not found!"
    echo "   Please run setup-ssl.sh first to install SSL certificates"
    exit 1
fi

# Backup current configuration
echo "📦 Backing up current nginx configuration..."
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.http-only.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created"

# Copy SSL-ready configuration
echo "📝 Copying SSL-ready nginx configuration..."
cp nginx-ssl-ready.conf /etc/nginx/nginx.conf

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ nginx configuration test passed"
    
    # Reload nginx
    echo "🔄 Reloading nginx..."
    systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo "✅ nginx reloaded successfully"
        echo ""
        echo "🎉 SSL upgrade completed successfully!"
        echo ""
        echo "🔗 Your applications are now accessible with SSL:"
        echo "   • Guest App: https://guest.mybackends.xyz"
        echo "   • Driver App: https://driver.mybackends.xyz"
        echo "   • Frontdesk App: https://frontdesk.mybackends.xyz"
        echo "   • Admin App: https://admin.mybackends.xyz"
        echo "   • Super Admin App: https://super.mybackends.xyz"
        echo "   • API Server: https://api.mybackends.xyz"
        echo ""
        echo "🔄 HTTP requests will automatically redirect to HTTPS"
        echo ""
        echo "📋 SSL certificates will auto-renew every 60 days"
    else
        echo "❌ Failed to reload nginx"
        exit 1
    fi
else
    echo "❌ nginx configuration test failed"
    echo "Please check the configuration and try again"
    exit 1
fi
