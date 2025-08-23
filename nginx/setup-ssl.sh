#!/bin/bash

# Setup SSL certificates using Let's Encrypt
# Run this script after DNS is configured and nginx is deployed

echo "🔒 Setting up SSL certificates for Shuttle application..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo"
    exit 1
fi

# Install certbot
echo "📦 Installing certbot..."
if command -v certbot &> /dev/null; then
    echo "✅ Certbot is already installed"
else
    # For Amazon Linux 2
    sudo yum install -y python3-pip
    sudo pip3 install certbot-nginx
    echo "✅ Certbot installed"
fi

# Domains to get certificates for
DOMAINS=(
    "mybackends.xyz"
    "guest.mybackends.xyz"
    "driver.mybackends.xyz"
    "frontdesk.mybackends.xyz"
    "admin.mybackends.xyz"
    "super.mybackends.xyz"
    "api.mybackends.xyz"
)

echo "🌐 Getting SSL certificates for the following domains:"
for domain in "${DOMAINS[@]}"; do
    echo "   • $domain"
done

echo ""
echo "⚠️  Important: Make sure DNS records are configured and propagated before continuing."
echo "   You can check with: nslookup guest.mybackends.xyz"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Get certificates for each domain
for domain in "${DOMAINS[@]}"; do
    echo "🔐 Getting certificate for $domain..."
    
    # Use certbot with nginx plugin
    certbot --nginx -d "$domain" --non-interactive --agree-tos --email your-email@example.com
    
    if [ $? -eq 0 ]; then
        echo "✅ Certificate obtained for $domain"
    else
        echo "❌ Failed to get certificate for $domain"
        echo "   Please check DNS configuration and try again"
    fi
done

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
        echo "🎉 SSL setup completed successfully!"
        echo ""
        echo "🔗 Your applications are now accessible with SSL:"
        echo "   • Guest App: https://guest.mybackends.xyz"
        echo "   • Driver App: https://driver.mybackends.xyz"
        echo "   • Frontdesk App: https://frontdesk.mybackends.xyz"
        echo "   • Admin App: https://admin.mybackends.xyz"
        echo "   • Super Admin App: https://super.mybackends.xyz"
        echo "   • API Server: https://api.mybackends.xyz"
        echo ""
        echo "🔄 Certificates will auto-renew every 60 days"
        echo ""
        echo "📋 To check certificate status:"
        echo "   certbot certificates"
        echo ""
        echo "📋 To manually renew certificates:"
        echo "   certbot renew"
    else
        echo "❌ Failed to reload nginx"
        exit 1
    fi
else
    echo "❌ nginx configuration test failed"
    echo "Please check the configuration and try again"
    exit 1
fi
