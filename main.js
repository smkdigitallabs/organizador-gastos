
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Security: Disable nodeIntegration
      contextIsolation: true, // Security: Enable contextIsolation
      preload: path.join(__dirname, 'preload.cjs'), // Security: Use preload script (CommonJS)
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
