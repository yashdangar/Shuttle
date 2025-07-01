# Selective Deployment Setup

This GitHub Actions workflow automatically detects changes in your monorepo and only builds/deploys the affected Next.js apps and server.

## How it works

1. **Change Detection**: Uses `dorny/paths-filter` to detect which directories have changes
2. **Selective Building**: Only builds and deploys the apps that have actual changes
3. **PM2 Management**: Automatically restarts the affected services using PM2
4. **Force Install**: Uses `npm install --force` to ensure clean installs

## Apps Monitored

- `admin/` - Admin panel
- `frontdesk/` - Front desk application
- `driver/` - Driver application
- `guest/` - Guest application
- `super-admin/` - Super admin panel
- `server/` - Express WebSocket server

## Setup Instructions

### 1. GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```
HOST: your-server-ip-address
USERNAME: your-server-username (e.g., azureuser)
SSH_KEY: your-private-ssh-key
```

### 2. SSH Key Setup

Generate an SSH key pair for GitHub Actions:

```bash
ssh-keygen -t rsa -b 4096 -C "github-actions"
```

- Add the public key to your server's `~/.ssh/authorized_keys`
- Add the private key to GitHub Secrets as `SSH_KEY`

### 3. PM2 Setup

Ensure your PM2 processes are named correctly on the server:

```bash
pm2 start npm --name "admin" -- start
pm2 start npm --name "frontdesk" -- start
pm2 start npm --name "driver" -- start
pm2 start npm --name "guest" -- start
pm2 start npm --name "super-admin" -- start
pm2 start npm --name "server" -- start
```

### 4. Server Directory Structure

Make sure your server has the correct directory structure:

```
~/Shuttle/
├── admin/
├── frontdesk/
├── driver/
├── guest/
├── super-admin/
└── server/
```

## Workflow Behavior

### Triggers

- Push to `main` branch
- Pull request to `main` branch

### Example Scenarios

**Scenario 1**: Only admin panel changes

- Detects changes in `admin/` directory
- Runs `npm install --force` in admin folder
- Runs `npm run build` in admin folder
- Restarts only the admin PM2 process

**Scenario 2**: Multiple apps change

- Detects changes in multiple directories
- Builds and restarts only the affected apps
- Other apps remain untouched

**Scenario 3**: No changes in monitored directories

- Workflow skips deployment entirely
- Saves CI/CD time and resources

## Monitoring

After deployment, the workflow shows PM2 status:

```bash
pm2 status
```

This helps verify all services are running correctly.

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**

   - Verify SSH key is correct
   - Check server IP and username
   - Ensure SSH access is allowed

2. **PM2 Process Not Found**

   - Check PM2 process names match exactly
   - Ensure PM2 is installed globally on server

3. **Build Failed**
   - Check Node.js version compatibility
   - Verify all dependencies are available
   - Check for syntax errors in changed files

### Manual Deployment

If needed, you can manually deploy a specific app:

```bash
cd ~/Shuttle/admin
npm install --force
npm run build
pm2 restart admin
```

## Performance Benefits

- **Faster deployments**: Only affected apps are built
- **Reduced server load**: Unchanged apps keep running
- **Resource efficiency**: No unnecessary builds
- **Targeted updates**: Easy to track what changed
