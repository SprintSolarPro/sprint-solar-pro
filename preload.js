// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Read a local file and return a data URL string (e.g., "data:image/png;base64,...")
   * Accepts absolute paths or paths relative to the app directory.
   * Returns null on failure.
   */
  readLocalFileAsDataUrl: async (filePath) => {
    try {
      // Ask main process to read the file and return a data URL
      const result = await ipcRenderer.invoke('read-local-file-as-data-url', String(filePath || ''));
      return result || null;
    } catch (err) {
      return null;
    }
  },

  /**
   * Save HTML content as a PDF using the main process.
   * The main process will open a hidden BrowserWindow, render the HTML, and call printToPDF.
   * Returns an object { success: true, path: '/path/to/file.pdf' } on success, or { success: false, error: '...' }.
   */
  savePdf: async (htmlContent, suggestedFilename) => {
    try {
      const result = await ipcRenderer.invoke('save-pdf', { html: String(htmlContent || ''), filename: String(suggestedFilename || '') });
      return result;
    } catch (err) {
      return { success: false, error: String(err && err.message ? err.message : err) };
    }
  }
});
