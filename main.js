const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Security: Disable nodeIntegration
      contextIsolation: true, // Security: Enable contextIsolation
      preload: path.join(__dirname, 'preload.js'), // Security: Use preload script
      sandbox: true // Security: Enable sandbox
    },
    icon: path.join(__dirname, 'icon.ico'), // Opcional: ícone personalizado
    title: 'Organizador de Gastos'
  });

  mainWindow.loadFile('index.html');
  
  // Remove menu bar (opcional)
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});