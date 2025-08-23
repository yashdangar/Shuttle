# EC2 Deployment Guide for Shuttle Application

## Instance Details
- **Instance ID**: i-0bd6f7988762cb8e5
- **Public IP**: 13.127.190.28
- **Instance Type**: t2.micro (Amazon Linux)
- **Region**: ap-south-1

## Step 1: Connect to EC2 Instance
```bash
ssh -i your-key.pem ec2-user@13.127.190.28
```

## Step 2: Update System Packages
```bash
sudo yum update -y
```

## Step 3: Install Node.js 18.x
```bash
# Install NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# Install Node.js
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 4: Install PM2 Globally
```bash
sudo npm install -y pm2 -g

# Verify PM2 installation
pm2 --version
```

## Step 5: Install nginx
```bash
# Install nginx
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

## Step 6: Configure Firewall (Security Group)
Make sure your EC2 security group allows:
- **SSH (Port 22)**: For remote access
- **HTTP (Port 80)**: For nginx
- **HTTPS (Port 443)**: For SSL (if needed)
- **Custom Ports**: For your application (e.g., 3000, 3001, etc.)

## Step 7: Clone and Setup Application
```bash
# Navigate to home directory
cd ~

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/yourusername/Shuttle.git

# Navigate to project directory
cd Shuttle

# Install dependencies for all applications
cd server && npm install
cd ../admin && npm install
cd ../driver && npm install
cd ../frontdesk && npm install
cd ../guest && npm install
cd ../super-admin && npm install
```

## Step 8: Build Applications
```bash
# Build all Next.js applications
cd ~/Shuttle/admin && npm run build
cd ~/Shuttle/driver && npm run build
cd ~/Shuttle/frontdesk && npm run build
cd ~/Shuttle/guest && npm run build
cd ~/Shuttle/super-admin && npm run build
```

## Step 9: Start Applications with PM2
```bash
# Start server
cd ~/Shuttle/server
pm2 start dist/index.js --name "shuttle-server"
cd ..
# Start admin app
cd ~/Shuttle/admin
pm2 start npm --name "shuttle-admin" -- start
cd ..

# Start driver app
cd ~/Shuttle/driver
pm2 start npm --name "shuttle-driver" -- start
cd ..

# Start frontdesk app
cd ~/Shuttle/frontdesk
pm2 start npm --name "shuttle-frontdesk" -- start
cd ..

# Start guest app
cd ~/Shuttle/guest
pm2 start npm --name "shuttle-guest" -- start
cd ..

# Start super-admin app
cd ~/Shuttle/super-admin
pm2 start npm --name "shuttle-super-admin" -- start
cd ..

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Step 10: Configure nginx (Basic Setup)
```bash
# Create nginx configuration
sudo nano /etc/nginx/conf.d/shuttle.conf
```

Add this basic configuration:
```nginx
server {
    listen 80;
    server_name 13.127.190.28;

    # Admin app
    location /admin {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Driver app
    location /driver {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontdesk app
    location /frontdesk {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Guest app
    location /guest {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Super Admin app
    location /super-admin {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API server
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Step 11: Test and Restart nginx
```bash
# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## Step 12: Useful PM2 Commands
```bash
# View all running processes
pm2 list

# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart all processes
pm2 restart all

# Stop all processes
pm2 stop all

# Delete all processes
pm2 delete all
```

## Step 13: Memory Management Commands
```bash
# Check memory usage
free -h

# Check disk usage
df -h

# Check running processes
top

# Check specific process memory
pm2 show shuttle-server
```

## Access URLs
- **Admin**: http://13.127.190.28/admin
- **Driver**: http://13.127.190.28/driver
- **Frontdesk**: http://13.127.190.28/frontdesk
- **Guest**: http://13.127.190.28/guest
- **Super Admin**: http://13.127.190.28/super-admin
- **API**: http://13.127.190.28/api

## Troubleshooting
```bash
# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check nginx access logs
sudo tail -f /var/log/nginx/access.log

# Check PM2 logs for specific app
pm2 logs shuttle-server

# Check if ports are listening
sudo netstat -tlnp
```
