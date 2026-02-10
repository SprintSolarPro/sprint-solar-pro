// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Uncomment during development:
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

// Quit when all windows are closed (except macOS behavior)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

/**
 * IPC handler: read a local file and return a data URL
 * Accepts absolute paths or paths relative to the app directory.
 * Returns a string "data:<mime>;base64,..." or null on failure.
 */
ipcMain.handle('read-local-file-as-data-url', async (event, filePath) => {
  try {
    if (!filePath) return null;
    // If filePath starts with file://, strip it
    let resolved = String(filePath || '');
    if (resolved.startsWith('file://')) {
      resolved = resolved.replace(/^file:\/\//i, '');
    }
    // If path is not absolute, resolve relative to app directory
    if (!path.isAbsolute(resolved)) {
      resolved = path.join(__dirname, resolved);
    }
    // Ensure file exists
    if (!fs.existsSync(resolved)) return null;
    const buffer = fs.readFileSync(resolved);
    const ext = path.extname(resolved).toLowerCase();
    let mime = 'application/octet-stream';
    if (ext === '.png') mime = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    else if (ext === '.svg') mime = 'image/svg+xml';
    else if (ext === '.gif') mime = 'image/gif';
    const base64 = buffer.toString('base64');
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.warn('read-local-file-as-data-url failed', err);
    return null;
  }
});

/**
 * IPC handler: save HTML string as PDF.
 * Payload: { html: '<html>...</html>', filename: 'suggested-name.pdf' }
 * Returns: { success: true, path: '/path/to/file.pdf' } or { success: false, error: '...' }
 */
ipcMain.handle('save-pdf', async (event, payload) => {
  try {
    const html = (payload && payload.html) ? String(payload.html) : '';
    const suggested = (payload && payload.filename) ? String(payload.filename) : '';

    if (!html) return { success: false, error: 'Empty HTML content' };

    // Create a hidden BrowserWindow to render the HTML
    const pdfWin = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    // Load the HTML via data URL
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    await pdfWin.loadURL(dataUrl);

    // Wait for finish
    await new Promise((resolve) => {
      if (pdfWin.webContents.isLoading()) {
        pdfWin.webContents.once('did-finish-load', () => resolve());
      } else {
        resolve();
      }
    });

    // Ask user where to save (suggest filename)
    const defaultPath = suggested || `quotation-${Date.now()}.pdf`;
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save quotation as PDF',
      defaultPath: path.join(app.getPath('documents'), defaultPath),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    // If user cancelled, still attempt to save to Documents with generated name
    let outPath = filePath;
    if (canceled) {
      outPath = path.join(app.getPath('documents'), defaultPath);
    }

    // Generate PDF from the hidden window
    const pdfOptions = { marginsType: 1, printBackground: true, pageSize: 'A4' };
    const pdfBuffer = await pdfWin.webContents.printToPDF(pdfOptions);

    // Write file
    fs.writeFileSync(outPath, pdfBuffer);

    // Clean up
    try { pdfWin.close(); } catch (e) {}
    return { success: true, path: outPath };
  } catch (err) {
    console.error('save-pdf failed', err);
    return { success: false, error: String(err && err.message ? err.message : err) };
  }
});
