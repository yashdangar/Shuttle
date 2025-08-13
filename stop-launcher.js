#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const os = require('os');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

// Ports used by the applications
const ports = [3000, 3001, 3002, 3003, 3004, 8080];
const appNames = {
    3000: 'Guest App',
    3001: 'Driver App', 
    3002: 'Frontdesk App',
    3003: 'Admin App',
    3004: 'Super Admin App',
    8080: 'Server'
};

function killProcessByPort(port) {
    return new Promise((resolve) => {
        const platform = os.platform();
        let command;
        
        if (platform === 'win32') {
            // Windows
            command = `netstat -ano | findstr :${port}`;
        } else {
            // macOS/Linux
            command = `lsof -ti:${port}`;
        }
        
        exec(command, (error, stdout) => {
            if (error || !stdout.trim()) {
                log(`${appNames[port]} - Port ${port} not in use`, colors.yellow);
                resolve();
                return;
            }
            
            let pids = [];
            
            if (platform === 'win32') {
                // Parse Windows netstat output
                const lines = stdout.trim().split('\n');
                pids = lines.map(line => {
                    const parts = line.trim().split(/\s+/);
                    return parts[parts.length - 1];
                }).filter(pid => pid && pid !== '0');
            } else {
                // Parse Unix lsof output
                pids = stdout.trim().split('\n').filter(pid => pid);
            }
            
            if (pids.length === 0) {
                log(`${appNames[port]} - No process found on port ${port}`, colors.yellow);
                resolve();
                return;
            }
            
            // Kill each process
            let killPromises = pids.map(pid => {
                return new Promise((killResolve) => {
                    const killCmd = platform === 'win32' ? `taskkill /f /pid ${pid}` : `kill -9 ${pid}`;
                    
                    exec(killCmd, (killError) => {
                        if (killError) {
                            log(`${appNames[port]} - Failed to kill PID ${pid}`, colors.red);
                        } else {
                            log(`${appNames[port]} - Stopped successfully (PID: ${pid})`, colors.green);
                        }
                        killResolve();
                    });
                });
            });
            
            Promise.all(killPromises).then(resolve);
        });
    });
}

async function stopAllApplications() {
    log('Stopping all Shuttle applications...', colors.red);
    log('');
    
    log('Stopping applications by port...', colors.blue);
    log('');
    
    // Stop all applications by their ports
    for (const port of ports) {
        await killProcessByPort(port);
    }
    
    log('');
    log('Stopping remaining Node.js processes...', colors.blue);
    
    // Kill remaining node processes (be careful with this)
    const platform = os.platform();
    const killNodeCmd = platform === 'win32' 
        ? 'taskkill /f /im node.exe' 
        : 'pkill -f node';
    
    exec(killNodeCmd, (error) => {
        if (error) {
            log('No additional Node.js processes found to stop', colors.yellow);
        } else {
            log('Additional Node.js processes stopped', colors.green);
        }
        
        log('');
        log('All Shuttle applications have been stopped!', colors.green);
        log('');
        log('Note: You can also manually close the terminal windows that opened.', colors.yellow);
        log('');
    });
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    log('Shuttle Application Stopper', colors.blue);
    log('');
    log('Usage: node stop-launcher.js [options]', colors.reset);
    log('');
    log('Options:', colors.reset);
    log('  --help, -h     Show this help message', colors.reset);
    log('  --ports, -p    Show ports that will be stopped', colors.reset);
    log('');
    log('This script will stop all running Shuttle applications by killing processes on their respective ports.', colors.reset);
    log('');
    process.exit(0);
}

if (args.includes('--ports') || args.includes('-p')) {
    log('Shuttle Application Ports:', colors.blue);
    log('');
    ports.forEach(port => {
        log(`  Port ${port}: ${appNames[port]}`, colors.cyan);
    });
    log('');
    process.exit(0);
}

// Stop all applications
stopAllApplications();
