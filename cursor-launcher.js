#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Project configurations
const projects = [
    {
        name: 'Server',
        path: 'server',
        port: 8080,
        command: 'npm run dev',
        color: colors.cyan
    },
    {
        name: 'Guest App',
        path: 'guest',
        port: 3000,
        command: 'npm run dev',
        color: colors.blue
    },
    {
        name: 'Driver App',
        path: 'driver',
        port: 3001,
        command: 'npm run dev',
        color: colors.yellow
    },
    {
        name: 'Frontdesk App',
        path: 'frontdesk',
        port: 3002,
        command: 'npm run dev',
        color: colors.magenta
    },
    {
        name: 'Admin App',
        path: 'admin',
        port: 3003,
        command: 'npm run dev',
        color: colors.green
    },
    {
        name: 'Super Admin App',
        path: 'super-admin',
        port: 3004,
        command: 'npm run dev',
        color: colors.red
    }
];

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

// Create VS Code tasks for each project
function createVSCodeTasks() {
    const tasksConfig = {
        version: "2.0.0",
        tasks: []
    };

    // Add individual project tasks
    projects.forEach(project => {
        tasksConfig.tasks.push({
            label: `Start ${project.name}`,
            type: "shell",
            command: "npm",
            args: ["run", "dev"],
            options: {
                cwd: `\${workspaceFolder}/${project.path}`
            },
            group: "build",
            presentation: {
                echo: true,
                reveal: "always",
                focus: false,
                panel: "new",
                showReuseMessage: false,
                clear: true
            },
            problemMatcher: [],
            runOptions: {
                runOn: "folderOpen"
            },
            detail: `Start ${project.name} in development mode (Port ${project.port})`
        });
    });

    // Add compound task to start all
    tasksConfig.tasks.push({
        label: "Start All Shuttle Projects",
        dependsOrder: "parallel",
        dependsOn: projects.map(p => `Start ${p.name}`),
        group: "build",
        detail: "Start all Shuttle projects in separate terminal panels"
    });

    return tasksConfig;
}

// Create launch configuration for debugging
function createLaunchConfig() {
    const launchConfig = {
        version: "0.2.0",
        configurations: []
    };

    // Add debug configurations for each Node.js project
    projects.forEach(project => {
        if (project.name === 'Server') {
            launchConfig.configurations.push({
                name: `Debug ${project.name}`,
                type: "node",
                request: "launch",
                program: "${workspaceFolder}/server/dist/index.js",
                cwd: "${workspaceFolder}/server",
                env: {
                    NODE_ENV: "development"
                },
                console: "integratedTerminal",
                skipFiles: ["<node_internals>/**"]
            });
        } else {
            launchConfig.configurations.push({
                name: `Debug ${project.name}`,
                type: "node",
                request: "launch",
                program: "${workspaceFolder}/node_modules/.bin/next",
                args: ["dev", "-p", project.port.toString()],
                cwd: `\${workspaceFolder}/${project.path}`,
                console: "integratedTerminal",
                skipFiles: ["<node_internals>/**"]
            });
        }
    });

    return launchConfig;
}

async function setupCursorIntegration() {
    log('Setting up Cursor IDE integration...', colors.blue);
    log('');

    // Ensure .vscode directory exists
    const vscodeDir = path.join(process.cwd(), '.vscode');
    if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
        log('Created .vscode directory', colors.green);
    }

    // Create tasks.json
    const tasksConfig = createVSCodeTasks();
    const tasksPath = path.join(vscodeDir, 'tasks.json');
    
    fs.writeFileSync(tasksPath, JSON.stringify(tasksConfig, null, 4));
    log('Created/updated .vscode/tasks.json', colors.green);

    // Create launch.json
    const launchConfig = createLaunchConfig();
    const launchPath = path.join(vscodeDir, 'launch.json');
    
    fs.writeFileSync(launchPath, JSON.stringify(launchConfig, null, 4));
    log('Created/updated .vscode/launch.json', colors.green);

    log('');
    log('Cursor IDE integration setup complete!', colors.green);
    log('');
    log('How to use:', colors.blue);
    log('1. Press Ctrl+Shift+P in Cursor', colors.cyan);
    log('2. Type "Tasks: Run Task"', colors.cyan);
    log('3. Select "Start All Shuttle Projects"', colors.cyan);
    log('');
    log('Or run individual projects:', colors.blue);
    projects.forEach(project => {
        log(`   - Start ${project.name}`, project.color);
    });
    log('');
    log('All projects will run in separate terminal panels within Cursor!', colors.green);
}

// Create a simple batch script for Windows users
function createWindowsScript() {
    const batchScript = `@echo off
echo Starting all Shuttle projects in Cursor IDE...
echo.
echo Press Ctrl+Shift+P in Cursor and select "Tasks: Run Task" then "Start All Shuttle Projects"
echo.
echo Or you can run this command in Cursor's terminal:
echo code --command "workbench.action.tasks.runTask" --args "Start All Shuttle Projects"
echo.
pause
`;

    fs.writeFileSync('start-in-cursor.bat', batchScript);
    log('Created start-in-cursor.bat for Windows users', colors.green);
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    log('Cursor IDE Integration Setup', colors.blue);
    log('');
    log('This script sets up VS Code/Cursor tasks to run all Shuttle projects', colors.reset);
    log('in separate terminal panels within the IDE.', colors.reset);
    log('');
    log('Usage: node cursor-launcher.js [options]', colors.reset);
    log('');
    log('Options:', colors.reset);
    log('  --help, -h     Show this help message', colors.reset);
    log('  --setup, -s    Setup Cursor integration (default)', colors.reset);
    log('');
    process.exit(0);
}

// Setup Cursor integration
setupCursorIntegration();
createWindowsScript();
