#!/bin/bash

# Deploy nginx configuration for Shuttle application
# Run this script on your EC2 instance

echo "🚀 Starting nginx deployment for Shuttle application..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo"
    exit 1
fi

# Backup existing nginx configuration
echo "📦 Backing up existing nginx configuration..."
if [ -f /etc/nginx/nginx.conf ]; then
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup created"
else
    echo "⚠️  No existing nginx.conf found"
fi

# Copy new nginx configuration
echo "📝 Copying new nginx configuration..."
cp nginx-production.conf /etc/nginx/nginx.conf

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
        echo "🎉 Deployment completed successfully!"
        echo ""
        echo "📋 Your applications are now accessible at:"
        echo "   • Guest App: https://guest.mybackends.xyz"
        echo "   • Driver App: https://driver.mybackends.xyz"
        echo "   • Frontdesk App: https://frontdesk.mybackends.xyz"
        echo "   • Admin App: https://admin.mybackends.xyz"
        echo "   • Super Admin App: https://super.mybackends.xyz"
        echo "   • API Server: https://api.mybackends.xyz"
        echo ""
        echo "⚠️  Note: SSL certificates are not configured yet."
        echo "   You'll need to set up SSL certificates for HTTPS to work."
        echo ""
        echo "🔧 Next steps:"
        echo "   1. Add DNS records in GoDaddy (see DNS_SETUP.md)"
        echo "   2. Install SSL certificates"
        echo "   3. Test all applications"
    else
        echo "❌ Failed to reload nginx"
        exit 1
    fi
else
    echo "❌ nginx configuration test failed"
    echo "Please check the configuration and try again"
    exit 1
fi
