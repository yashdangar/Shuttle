#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Nginx Installation and Configuration Script${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Update system packages
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}📦 Installing nginx...${NC}"
    apt install nginx -y
    echo -e "${GREEN}✅ Nginx installed successfully${NC}"
else
    echo -e "${GREEN}✅ Nginx is already installed${NC}"
fi

# Install additional dependencies
echo -e "${YELLOW}📦 Installing additional dependencies...${NC}"
apt install -y curl wget certbot python3-certbot-nginx

# Backup existing nginx config
if [ -f /etc/nginx/nginx.conf ]; then
    echo -e "${YELLOW}📋 Backing up existing nginx configuration...${NC}"
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Backup created${NC}"
fi

# Copy our nginx configuration
echo -e "${YELLOW}📋 Installing nginx configuration...${NC}"
cp nginx.conf /etc/nginx/nginx.conf

# Create nginx directories if they don't exist
mkdir -p /var/log/nginx
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Set proper permissions
chown -R nginx:nginx /var/log/nginx
chmod 755 /var/log/nginx

# Test nginx configuration
echo -e "${YELLOW}🔍 Testing nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration test failed${NC}"
    exit 1
fi

# Enable nginx to start on boot
echo -e "${YELLOW}🚀 Enabling nginx to start on boot...${NC}"
systemctl enable nginx

# Start nginx
echo -e "${YELLOW}🚀 Starting nginx...${NC}"
systemctl start nginx

# Check nginx status
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running successfully${NC}"
else
    echo -e "${RED}❌ Failed to start nginx${NC}"
    systemctl status nginx
    exit 1
fi

# Configure firewall (if ufw is available)
if command -v ufw &> /dev/null; then
    echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
    ufw allow 'Nginx Full'
    ufw allow ssh
    echo -e "${GREEN}✅ Firewall configured${NC}"
fi

# Create SSL certificate script
echo -e "${YELLOW}📝 Creating SSL certificate script...${NC}"
cat > /root/setup-ssl.sh << 'EOF'
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 SSL Certificate Setup Script${NC}"
echo -e "${BLUE}==============================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Get domain from user
read -p "Enter your domain (e.g., mybackends.xyz): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Domain cannot be empty${NC}"
    exit 1
fi

echo -e "${YELLOW}🔒 Setting up SSL certificates for ${DOMAIN} and subdomains...${NC}"

# Create certificates for main domain and subdomains
domains=(
    "$DOMAIN"
    "guest.$DOMAIN"
    "driver.$DOMAIN"
    "frontdesk.$DOMAIN"
    "admin.$DOMAIN"
    "super.$DOMAIN"
    "api.$DOMAIN"
)

for domain in "${domains[@]}"; do
    echo -e "${YELLOW}📋 Creating certificate for $domain...${NC}"
    
    # Stop nginx temporarily
    systemctl stop nginx
    
    # Create certificate
    certbot certonly --standalone -d "$domain" --non-interactive --agree-tos --email admin@$DOMAIN
    
    # Start nginx
    systemctl start nginx
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Certificate created for $domain${NC}"
    else
        echo -e "${RED}❌ Failed to create certificate for $domain${NC}"
    fi
done

# Update nginx configuration with SSL certificates
echo -e "${YELLOW}📋 Updating nginx configuration with SSL certificates...${NC}"

# Create a script to update nginx config with SSL
cat > /tmp/update-nginx-ssl.sh << 'SSL_EOF'
#!/bin/bash

# Backup current config
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)

# Update nginx config to uncomment SSL lines
sed -i 's/# ssl_certificate/ssl_certificate/g' /etc/nginx/nginx.conf
sed -i 's/# ssl_certificate_key/ssl_certificate_key/g' /etc/nginx/nginx.conf

# Test and reload nginx
if nginx -t; then
    systemctl reload nginx
    echo -e "${GREEN}✅ Nginx configuration updated and reloaded${NC}"
else
    echo -e "${RED}❌ Nginx configuration test failed${NC}"
    exit 1
fi
SSL_EOF

chmod +x /tmp/update-nginx-ssl.sh
/tmp/update-nginx-ssl.sh

echo -e "${GREEN}🎉 SSL setup completed!${NC}"
echo -e "${BLUE}📋 Your applications are now available at:${NC}"
echo -e "${GREEN}   • https://guest.$DOMAIN${NC}"
echo -e "${GREEN}   • https://driver.$DOMAIN${NC}"
echo -e "${GREEN}   • https://frontdesk.$DOMAIN${NC}"
echo -e "${GREEN}   • https://admin.$DOMAIN${NC}"
echo -e "${GREEN}   • https://super.$DOMAIN${NC}"
echo -e "${GREEN}   • https://api.$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo -e "${YELLOW}   1. Point your domain DNS to this server's IP${NC}"
echo -e "${YELLOW}   2. Set up automatic certificate renewal:${NC}"
echo -e "${YELLOW}      crontab -e${NC}"
echo -e "${YELLOW}      Add: 0 12 * * * /usr/bin/certbot renew --quiet${NC}"
EOF

chmod +x /root/setup-ssl.sh

echo ""
echo -e "${GREEN}🎉 Nginx installation and configuration completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "${YELLOW}1. Point your domain DNS to this server's IP address${NC}"
echo -e "${YELLOW}2. Run SSL certificate setup:${NC}"
echo -e "${GREEN}   sudo /root/setup-ssl.sh${NC}"
echo -e "${YELLOW}3. Start your applications using the shell scripts${NC}"
echo ""
echo -e "${BLUE}📱 Your applications will be available at:${NC}"
echo -e "${GREEN}   • http://guest.mybackends.xyz (redirects to HTTPS)${NC}"
echo -e "${GREEN}   • http://driver.mybackends.xyz (redirects to HTTPS)${NC}"
echo -e "${GREEN}   • http://frontdesk.mybackends.xyz (redirects to HTTPS)${NC}"
echo -e "${GREEN}   • http://admin.mybackends.xyz (redirects to HTTPS)${NC}"
echo -e "${GREEN}   • http://super.mybackends.xyz (redirects to HTTPS)${NC}"
echo -e "${GREEN}   • http://api.mybackends.xyz (redirects to HTTPS)${NC}"
echo ""
echo -e "${BLUE}🔧 Nginx status:${NC}"
systemctl status nginx --no-pager -l
