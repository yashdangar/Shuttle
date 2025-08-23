# Complete Deployment Guide for Shuttle Domain Setup

## Overview

This guide will help you deploy your Shuttle application with domain support and WebSocket functionality.

## Prerequisites

- ✅ EC2 instance running (IP: 13.127.190.28)
- ✅ All applications running with PM2
- ✅ Domain: mybackends.xyz (purchased from GoDaddy)
- ✅ SSH access to EC2 instance

## Step 1: DNS Configuration (GoDaddy)

### 1.1 Add DNS Records

Follow the instructions in `DNS_SETUP.md` to add the following A records in GoDaddy:

| Type | Name      | Value         | TTL |
| ---- | --------- | ------------- | --- |
| A    | @         | 13.127.190.28 | 600 |
| A    | www       | 13.127.190.28 | 600 |
| A    | guest     | 13.127.190.28 | 600 |
| A    | driver    | 13.127.190.28 | 600 |
| A    | frontdesk | 13.127.190.28 | 600 |
| A    | admin     | 13.127.190.28 | 600 |
| A    | super     | 13.127.190.28 | 600 |
| A    | api       | 13.127.190.28 | 600 |

### 1.2 Verify DNS Propagation

```bash
# Test DNS resolution
nslookup guest.mybackends.xyz
nslookup api.mybackends.xyz
```

Wait for DNS propagation (can take up to 48 hours, but usually much faster).

## Step 2: Deploy nginx Configuration

### 2.1 Upload Configuration Files

Upload these files to your EC2 instance:

- `nginx-production.conf`
- `deploy-nginx.sh`
- `setup-ssl.sh`

### 2.2 Deploy nginx Configuration

```bash
# SSH to your EC2 instance
ssh -i your-key.pem ec2-user@13.127.190.28

# Navigate to the nginx directory
cd ~/Shuttle/nginx

# Make scripts executable
chmod +x deploy-nginx.sh
chmod +x setup-ssl.sh

# Deploy nginx configuration
sudo ./deploy-nginx.sh
```

## Step 3: Test HTTP Access

After DNS propagation, test your applications:

```bash
# Test HTTP access (will redirect to HTTPS)
curl -I http://guest.mybackends.xyz
curl -I http://api.mybackends.xyz
```

## Step 4: Setup SSL Certificates

### 4.1 Install SSL Certificates

```bash
# Run SSL setup script
sudo ./setup-ssl.sh
```

**Important**: Update the email address in the script before running:

```bash
# Edit the script to use your email
nano setup-ssl.sh
# Change: your-email@example.com to your actual email
```

### 4.2 Verify SSL Setup

```bash
# Check certificate status
certbot certificates

# Test HTTPS access
curl -I https://guest.mybackends.xyz
```

## Step 5: Update Application Configurations

### 5.1 Update API Base URLs

Update your frontend applications to use the new domain:

**Guest App** (`guest/lib/api.ts`):

```typescript
const API_BASE_URL = "https://api.mybackends.xyz";
```

**Driver App** (`driver/lib/api.ts`):

```typescript
const API_BASE_URL = "https://api.mybackends.xyz";
```

**Frontdesk App** (`frontdesk/lib/api.ts`):

```typescript
const API_BASE_URL = "https://api.mybackends.xyz";
```

**Admin App** (`admin/lib/api.ts`):

```typescript
const API_BASE_URL = "https://api.mybackends.xyz";
```

### 5.2 Update WebSocket URLs

Update WebSocket connections in your applications:

```typescript
// Example WebSocket connection
const socket = io("https://api.mybackends.xyz", {
  auth: {
    token: userToken,
  },
});
```

## Step 6: Final Testing

### 6.1 Test All Applications

Visit each application in your browser:

- **Guest App**: https://guest.mybackends.xyz
- **Driver App**: https://driver.mybackends.xyz
- **Frontdesk App**: https://frontdesk.mybackends.xyz
- **Admin App**: https://admin.mybackends.xyz
- **Super Admin App**: https://super.mybackends.xyz
- **API Server**: https://api.mybackends.xyz

### 6.2 Test WebSocket Functionality

- Test real-time chat features
- Test live location updates
- Test booking notifications

## Step 7: Monitoring and Maintenance

### 7.1 Check Application Status

```bash
# Check PM2 status
pm2 list

# Check nginx status
sudo systemctl status nginx

# Check SSL certificate expiration
certbot certificates
```

### 7.2 View Logs

```bash
# nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application logs
pm2 logs shuttle-server
pm2 logs shuttle-guest
```

### 7.3 SSL Certificate Renewal

Certificates auto-renew, but you can manually renew:

```bash
sudo certbot renew
```

## Troubleshooting

### Common Issues

#### 1. DNS Not Resolving

```bash
# Check DNS propagation
nslookup guest.mybackends.xyz
# Should return: 13.127.190.28
```

#### 2. SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Renew certificates
sudo certbot renew
```

#### 3. nginx Configuration Errors

```bash
# Test nginx configuration
sudo nginx -t

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

#### 4. WebSocket Connection Issues

- Check if WebSocket endpoint is accessible: `https://api.mybackends.xyz/socket.io/`
- Verify CORS settings in your server
- Check browser console for WebSocket errors

#### 5. Application Not Loading

```bash
# Check if applications are running
pm2 list

# Restart applications if needed
pm2 restart all
```

## Security Considerations

### 1. Firewall Configuration

Ensure your EC2 security group allows:

- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 22 (SSH)

### 2. SSL/TLS Security

- Certificates auto-renew every 60 days
- Use HTTPS for all communications
- WebSocket connections use WSS (secure)

### 3. Rate Limiting

- API endpoints have rate limiting configured
- Login endpoints have stricter rate limiting

## Performance Optimization

### 1. nginx Optimizations

- Gzip compression enabled
- Static file caching
- Connection pooling

### 2. WebSocket Optimizations

- Connection timeouts configured
- Heartbeat mechanisms in place
- Efficient room management

## Backup and Recovery

### 1. Configuration Backup

```bash
# Backup nginx configuration
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Backup SSL certificates
sudo cp -r /etc/letsencrypt /etc/letsencrypt.backup
```

### 2. Application Backup

```bash
# Backup PM2 configuration
pm2 save
pm2 startup
```

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Check application logs for errors
2. **Monthly**: Review SSL certificate status
3. **Quarterly**: Update system packages
4. **As needed**: Monitor application performance

### Emergency Procedures

1. **Application down**: `pm2 restart all`
2. **nginx down**: `sudo systemctl restart nginx`
3. **SSL issues**: `sudo certbot renew`
4. **DNS issues**: Check GoDaddy DNS settings

---

## Quick Reference Commands

```bash
# Check application status
pm2 list

# Check nginx status
sudo systemctl status nginx

# Check SSL certificates
certbot certificates

# View nginx logs
sudo tail -f /var/log/nginx/error.log

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Restart all applications
pm2 restart all
```

Your Shuttle application is now fully deployed with domain support and WebSocket functionality! 🚀
