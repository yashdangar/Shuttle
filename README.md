# 🚀 Shuttle Cursor IDE Integration

Start all 5 Shuttle projects (4 Next.js apps + 1 Node.js server) simultaneously in separate terminal panels within Cursor IDE with a single command.

## ✨ Quick Start

### 🎯 **Start All Projects in Cursor**
1. **Press `Ctrl+Shift+P`** in Cursor
2. **Type "Tasks: Run Task"**
3. **Select "Start All Shuttle Projects"**

This will create **6 separate terminal panels** in Cursor, each running a different project!

### 🛑 **Stop All Projects in Cursor**
1. **Press `Ctrl+Shift+P`** in Cursor
2. **Type "Tasks: Run Task"**
3. **Select "Stop All Shuttle Projects"**

## 📱 Projects & Ports

| Project | Port | URL | Description |
|---------|------|-----|-------------|
| **Server** | 8080 | http://localhost:8080 | Node.js Backend API |
| **Guest App** | 3000 | http://localhost:3000 | Guest Interface (Next.js) |
| **Driver App** | 3001 | http://localhost:3001 | Driver Interface (Next.js) |
| **Frontdesk App** | 3002 | http://localhost:3002 | Frontdesk Interface (Next.js) |
| **Admin App** | 3003 | http://localhost:3003 | Admin Interface (Next.js) |
| **Super Admin App** | 3004 | http://localhost:3004 | Super Admin Interface (Next.js) |

## 🎮 Available Tasks in Cursor

Access these through **`Ctrl+Shift+P` → "Tasks: Run Task"**:

### 🚀 **Development Tasks**
- **"Start All Shuttle Projects"** - Start all projects in separate terminals
- **"Start Server"** - Start only the Node.js server
- **"Start Guest App"** - Start only the guest interface
- **"Start Driver App"** - Start only the driver interface
- **"Start Frontdesk App"** - Start only the frontdesk interface
- **"Start Admin App"** - Start only the admin interface
- **"Start Super Admin App"** - Start only the super admin interface

### 🛑 **Management Tasks**
- **"Stop All Shuttle Projects"** - Stop all running projects
- **"Build All Shuttle Projects"** - Build all projects for production

### 🔨 **Individual Build Tasks**
- **"Build Server"** - Build server for production
- **"Build Guest App"** - Build guest app for production
- **"Build Driver App"** - Build driver app for production
- **"Build Frontdesk App"** - Build frontdesk app for production
- **"Build Admin App"** - Build admin app for production
- **"Build Super Admin App"** - Build super admin app for production

## 🔧 Setup & Prerequisites

### **One-time Setup**
```bash
npm run setup
```
This configures the VS Code tasks and launch configurations.

### **Prerequisites**
1. **Node.js** (version 14 or higher)
2. **Dependencies installed** in all project folders:
   ```bash
   # Install dependencies for all projects
   cd admin && npm install && cd ..
   cd driver && npm install && cd ..
   cd frontdesk && npm install && cd ..
   cd guest && npm install && cd ..
   cd server && npm install && cd ..
   cd super-admin && npm install && cd ..
   ```

## 💡 How It Works

### **Development Mode**
- Each project runs `npm run dev`
- Hot reload enabled for all Next.js apps
- Server runs with `npm run dev` (nodemon with ts-node)
- Each project opens in its own terminal panel within Cursor

### **Terminal Panel Management**
- **Clean UI**: Each project gets its own labeled terminal panel
- **Easy Switching**: Click between panels to monitor different projects
- **Integrated Experience**: Everything stays within Cursor IDE
- **No External Windows**: No cluttered desktop with multiple terminal windows

## 🎯 Usage Examples

### **Start Everything**
`Ctrl+Shift+P` → "Tasks: Run Task" → "Start All Shuttle Projects"

### **Start Individual Project**
`Ctrl+Shift+P` → "Tasks: Run Task" → "Start [Project Name]"

### **Stop Everything**
`Ctrl+Shift+P` → "Tasks: Run Task" → "Stop All Shuttle Projects"

### **Build for Production**
`Ctrl+Shift+P` → "Tasks: Run Task" → "Build All Shuttle Projects"

## 🔍 Alternative Methods

### **Using NPM Scripts**
```bash
# Setup integration
npm run setup

# Stop all projects  
npm run stop

# Show help
npm run help

# Show ports
npm run ports
```

### **Quick Access Batch File (Windows)**
```cmd
start-in-cursor.bat
```

## 🚪 Stopping Projects

### **Method 1: Use the Stop Task (Recommended)**
`Ctrl+Shift+P` → "Tasks: Run Task" → "Stop All Shuttle Projects"

### **Method 2: Manual Terminal Control**
- In each terminal panel, press `Ctrl+C` to stop that specific project
- Or close the terminal panel

### **Method 3: Command Line**
```bash
npm run stop
```

## 🌟 Features

- ✅ **Integrated Terminals**: All projects run in Cursor terminal panels
- ✅ **One-Click Start**: Single command starts everything
- ✅ **One-Click Stop**: Single command stops everything  
- ✅ **Individual Control**: Start/stop projects individually
- ✅ **Hot Reload**: Development mode with auto-refresh
- ✅ **Clean UI**: No external terminal windows
- ✅ **Easy Monitoring**: Switch between project logs easily
- ✅ **Build Integration**: Build tasks for production
- ✅ **Port Management**: Predefined ports for each service

## 📁 File Structure

```
Shuttle/
├── .vscode/
│   ├── tasks.json              # Cursor/VS Code task definitions
│   └── launch.json             # Debug configurations
├── cursor-launcher.js          # Setup script for Cursor integration
├── stop-launcher.js            # Stop script for all projects
├── start-in-cursor.bat         # Windows quick access script
├── package.json               # NPM scripts and metadata
├── README.md                  # This file
├── admin/                     # Admin Next.js app (port 3003)
├── driver/                    # Driver Next.js app (port 3001)
├── frontdesk/                 # Frontdesk Next.js app (port 3002)
├── guest/                     # Guest Next.js app (port 3000)
├── server/                    # Node.js backend (port 8080)
└── super-admin/               # Super Admin Next.js app (port 3004)
```

## 🔧 Troubleshooting

### **Tasks Don't Appear**
1. Make sure you're in the Shuttle workspace root
2. Run `npm run setup` to reconfigure
3. Restart Cursor IDE

### **Port Already in Use**
1. Use the "Stop All Shuttle Projects" task
2. Or run `npm run stop`
3. Check what's using ports: `npm run ports`

### **Projects Fail to Start**
1. Ensure all dependencies are installed in each project folder
2. Check that Node.js is installed and accessible
3. Verify each project can run individually with `npm run dev`

## 🤝 Contributing

To modify or extend the integration:

1. **Update tasks**: Edit `.vscode/tasks.json`
2. **Update setup script**: Modify `cursor-launcher.js`
3. **Update stop functionality**: Modify `stop-launcher.js`
4. **Test changes**: Run `npm run setup` after changes

## 📝 License

MIT License - Feel free to modify and distribute as needed.

---

**Happy coding with Cursor IDE! 🎉**
