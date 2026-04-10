const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");

app.commandLine.appendSwitch("js-flags", "--max-old-space-size=4096");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

if (global.gc) {
  console.log("Garbage collection manual habilitado");
}

let mainWindow;
let configController;
let processController;
let internalComparisonController;
let processingStartTime = null;

let ExcelConfigController;
let ProcessController;
let InternalComparisonController;

function createWindow() {
  if (!ExcelConfigController) {
    ExcelConfigController = require("./presentation/controllers/ExcelConfigController");
    ProcessController = require("./presentation/controllers/ProcessController");
    InternalComparisonController = require("./presentation/controllers/InternalComparisonController");
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  configController = new ExcelConfigController();
  processController = new ProcessController();
  internalComparisonController = new InternalComparisonController();

  mainWindow.loadFile("presentation/views/mode-selection.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("navigate-to", (_event, page) => {
  console.log("Navegando a:", page);

  const pages = {
    "mode-selection": "presentation/views/mode-selection.html",
    "compare-files": "index.html",
    index: "index.html",
    "config-excel1": "presentation/views/config-excel1.html",
    "config-excel2": "presentation/views/config-excel2.html",
    processing: "presentation/views/processing.html",
    "generate-file": "presentation/views/processing.html",
    "compare-internal": "presentation/views/compare-internal.html",
  };

  if (page === "index" || page === "mode-selection") {
    processController.reset();
    internalComparisonController.reset();
    processingStartTime = null;
  }

  if (pages[page]) {
    mainWindow.loadFile(pages[page]);
  } else {
    console.error("Pagina no encontrada:", page);
  }
});

ipcMain.on("select-mode", (_event, mode) => {
  if (mode === "compare") {
    mainWindow.loadFile("index.html");
  } else if (mode === "compare-internal") {
    mainWindow.loadFile("presentation/views/compare-internal.html");
  }
});

ipcMain.handle("select-excel-file", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Seleccionar archivo Excel",
      filters: [
        { name: "Archivos Excel", extensions: ["xlsx", "xls"] },
        { name: "Todos los archivos", extensions: ["*"] },
      ],
      properties: ["openFile"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false };
    }

    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath);

    return {
      success: true,
      filePath,
      fileName,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("load-excel-files", async (_event, data) => {
  const startTime = performance.now();

  try {
    const result1 = await configController.loadSourceFile(data.file1Path);
    if (!result1.success) {
      return { success: false, error: `Archivo 1: ${result1.error}` };
    }

    const result2 = await configController.loadTargetFile(data.file2Path);
    if (!result2.success) {
      return { success: false, error: `Archivo 2: ${result2.error}` };
    }

    const endTime = performance.now();
    const loadTime = ((endTime - startTime) / 1000).toFixed(2);

    return { success: true, loadTime };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Error desconocido al cargar archivos",
    };
  }
});

ipcMain.handle("get-controller", async () => configController);

ipcMain.handle("get-source-filename", async () => {
  return configController.getSourceFile()?.name || "Desconocido";
});

ipcMain.handle("get-source-sheets", async () => {
  return configController.getSourceFile().getSheetNames();
});

ipcMain.handle("set-source-sheet", async (_event, sheetName) => {
  configController.setSourceSheet(sheetName);
  return { success: true };
});

ipcMain.handle("set-source-header-row", async (_event, rowNumber) => {
  configController.setSourceHeaderRow(rowNumber);
  return { success: true };
});

ipcMain.handle("get-source-preview", async () => {
  return configController.getSourcePreview();
});

ipcMain.handle("get-source-columns", async () => {
  return configController.getSourceColumns();
});

ipcMain.handle("set-source-search-columns", async (_event, columnLetters) => {
  configController.setSourceSearchColumns(columnLetters);
  return { success: true };
});

ipcMain.handle("set-source-data-columns", async (_event, columnLetters) => {
  configController.setSourceDataColumns(columnLetters);
  return { success: true };
});

ipcMain.handle("validate-source-config", async () => {
  return configController.validateSourceConfig();
});

ipcMain.handle("get-target-filename", async () => {
  return configController.getTargetFile()?.name || "Desconocido";
});

ipcMain.handle("get-target-sheets", async () => {
  return configController.getTargetFile().getSheetNames();
});

ipcMain.handle("set-target-sheet", async (_event, sheetName) => {
  configController.setTargetSheet(sheetName);
  return { success: true };
});

ipcMain.handle("set-target-header-row", async (_event, rowNumber) => {
  configController.setTargetHeaderRow(rowNumber);
  return { success: true };
});

ipcMain.handle("get-target-preview", async () => {
  return configController.getTargetPreview();
});

ipcMain.handle("get-target-columns", async () => {
  return configController.getTargetColumns();
});

ipcMain.handle("set-target-search-columns", async (_event, columnLetters) => {
  configController.setTargetSearchColumns(columnLetters);
  return { success: true };
});

ipcMain.handle("set-target-data-columns", async (_event, columnLetters) => {
  configController.setTargetDataColumns(columnLetters);
  return { success: true };
});

ipcMain.handle("validate-target-config", async () => {
  return configController.validateTargetConfig();
});

ipcMain.handle("start-comparison", async () => {
  try {
    const sourceFile = configController.getSourceFile();
    const targetFile = configController.getTargetFile();

    const result = await processController.compareFiles(
      sourceFile,
      targetFile,
      (processed, total) => {
        mainWindow.webContents.send("comparison-progress", {
          processed,
          total,
        });

        if (global.gc && processed % 1000 === 0) {
          global.gc();
        }
      }
    );

    if (global.gc) {
      global.gc();
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("generate-result-file", async () => {
  try {
    const sourceFile = configController.getSourceFile();
    const targetFile = configController.getTargetFile();

    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: "Guardar resultados de ReconGrid",
      defaultPath: path.join(
        app.getPath("documents"),
        `recongrid_resultados_${Date.now()}.xlsx`
      ),
      filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
    });

    if (canceled || !filePath) {
      return { success: false, error: "Guardado cancelado" };
    }

    const result = await processController.generateResultFile(
      sourceFile,
      targetFile,
      filePath
    );

    if (!result.success) {
      return result;
    }

    let totalProcessingTime = null;
    if (processingStartTime) {
      const endTime = Date.now();
      totalProcessingTime = ((endTime - processingStartTime) / 1000).toFixed(2);
      processingStartTime = null;
    }

    const matchResults = processController.getMatchResults();
    const exactMatches = matchResults.filter((r) => r.isExact()).length;
    const noMatches = matchResults.filter(
      (r) => r.matchType === "no_match"
    ).length;

    return {
      success: true,
      filePath: result.filePath,
      totalRows: result.totalRows,
      exactMatches,
      noMatches,
      processingTime: totalProcessingTime,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.on("open-result-file", (_event, filePath) => {
  shell.openPath(filePath).catch((error) => {
    dialog.showErrorBox("Error", `No se pudo abrir el archivo: ${error.message}`);
  });
});

ipcMain.handle("get-excel-sheets", async (_event, filePath) => {
  try {
    const sheets = await internalComparisonController.getSheetNames(filePath);
    return { success: true, sheets };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle(
  "get-sheet-preview",
  async (_event, filePath, sheetName, headerRow) => {
    try {
      const preview = await internalComparisonController.getSheetPreview(
        filePath,
        sheetName,
        headerRow
      );
      return { success: true, preview };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle("start-internal-comparison", async (_event, config) => {
  try {
    processingStartTime = Date.now();

    const result = await internalComparisonController.compareColumns(
      config,
      (processed, total) => {
        mainWindow.webContents.send("internal-comparison-progress", {
          processed,
          total,
        });

        if (global.gc && processed % 1000 === 0) {
          global.gc();
        }
      }
    );

    if (global.gc) {
      global.gc();
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("generate-internal-comparison-file", async () => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: "Guardar resultados de ReconGrid",
      defaultPath: path.join(
        app.getPath("documents"),
        `recongrid_comparacion_interna_${Date.now()}.xlsx`
      ),
      filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
    });

    if (canceled || !filePath) {
      return { success: false, error: "Guardado cancelado" };
    }

    const result = await internalComparisonController.generateResultFile(
      filePath
    );

    if (!result.success) {
      return result;
    }

    let totalProcessingTime = null;
    if (processingStartTime) {
      const endTime = Date.now();
      totalProcessingTime = ((endTime - processingStartTime) / 1000).toFixed(2);
      processingStartTime = null;
    }

    return {
      success: true,
      filePath: result.filePath,
      creationTime: result.creationTime,
      stats: result.stats,
      processingTime: totalProcessingTime,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  dialog.showErrorBox("Error Critico", error.message);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
  dialog.showErrorBox("Error Critico", error.message);
});
