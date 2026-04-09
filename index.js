const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");

// Optimizaciones de memoria para archivos grandes
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=4096");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

// Habilitar garbage collection explícito si está disponible
if (global.gc) {
  console.log("Garbage collection manual habilitado");
}

let mainWindow;
let configController;
let processController;
let catalogController;
let internalComparisonController;
let processingStartTime = null; // Variable para medir el tiempo de procesamiento

// Importar controladores después de que la app esté lista
let ExcelConfigController;
let ProcessController;
let CatalogController;
let InternalComparisonController;

function createWindow() {
  // Cargar controladores aquí, cuando la app ya está lista
  if (!ExcelConfigController) {
    ExcelConfigController = require("./presentation/controllers/ExcelConfigController");
    ProcessController = require("./presentation/controllers/ProcessController");
    CatalogController = require("./presentation/controllers/CatalogController");
    InternalComparisonController = require("./presentation/controllers/InternalComparisonController");
  }
  // Determinar la ruta correcta del icono según el entorno
  let iconPath;
  if (app.isPackaged) {
    // En producción: el icono está en resources/assets (extraResources)
    iconPath = path.join(process.resourcesPath, "assets", "icon.ico");
  } else {
    // En desarrollo: el icono está en la carpeta del proyecto
    iconPath = path.join(__dirname, "assets", "icon.ico");
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Asegurar que el icono se aplique en Windows
  if (process.platform === "win32") {
    mainWindow.setIcon(iconPath);
  }

  // Inicializar controladores
  configController = new ExcelConfigController();
  processController = new ProcessController();
  catalogController = new CatalogController();
  internalComparisonController = new InternalComparisonController();

  // Cargar la pantalla de selección de modo al inicio
  mainWindow.loadFile("presentation/views/mode-selection.html");

  // Abrir DevTools en desarrollo (opcional) - Deshabilitado para producción
  // mainWindow.webContents.openDevTools();
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

// ==================== IPC HANDLERS ====================

// Navegación entre páginas
ipcMain.on("navigate-to", (event, page) => {
  console.log("📍 Navegando a:", page);
  const pages = {
    "mode-selection": "presentation/views/mode-selection.html",
    "compare-files": "index.html",
    index: "index.html",
    "config-excel1": "presentation/views/config-excel1.html",
    "config-excel2": "presentation/views/config-excel2.html",
    processing: "presentation/views/processing.html",
    "generate-file": "presentation/views/processing.html",
    "catalog-results": "presentation/views/catalog-results.html",
    "compare-internal": "presentation/views/compare-internal.html",
  };

  // Resetear caché cuando vuelven al inicio o a la selección de modo
  if (page === "index" || page === "mode-selection") {
    console.log("🔄 Reseteando controladores...");
    processController.reset();
    catalogController.reset();
    internalComparisonController.reset();
    processingStartTime = null; // Resetear cronómetro también
  }

  if (pages[page]) {
    console.log("✅ Cargando archivo:", pages[page]);
    mainWindow.loadFile(pages[page]);
  } else {
    console.error("❌ Página no encontrada:", page);
  }
});

// Selección de modo de operación
ipcMain.on("select-mode", (event, mode) => {
  if (mode === "catalog") {
    // Redirigir a la pantalla de catalogación (la crearemos después)
    mainWindow.loadFile("presentation/views/catalog-file-selection.html");
  } else if (mode === "compare") {
    // Redirigir a la pantalla de comparación (la actual index.html)
    mainWindow.loadFile("index.html");
  } else if (mode === "compare-internal") {
    // Redirigir a la pantalla de comparación interna
    mainWindow.loadFile("presentation/views/compare-internal.html");
  }
});

// Seleccionar archivo Excel
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
      filePath: filePath,
      fileName: fileName,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Cargar archivos Excel iniciales
ipcMain.handle("load-excel-files", async (event, data) => {
  // Iniciar cronómetro
  const startTime = performance.now();
  console.log("⏱️ Cronómetro iniciado - Cargando archivos...");

  try {
    console.log("Cargando archivo 1:", data.file1Path);
    const result1 = await configController.loadSourceFile(data.file1Path);
    if (!result1.success) {
      console.error("Error en archivo 1:", result1.error);
      return { success: false, error: `Archivo 1: ${result1.error}` };
    }

    console.log("Cargando archivo 2:", data.file2Path);
    const result2 = await configController.loadTargetFile(data.file2Path);
    if (!result2.success) {
      console.error("Error en archivo 2:", result2.error);
      return { success: false, error: `Archivo 2: ${result2.error}` };
    }

    // Calcular tiempo total de carga
    const endTime = performance.now();
    const loadTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log("Archivos cargados exitosamente");
    console.log(`⏱️  Tiempo total de carga de archivos: ${loadTime} segundos`);

    return { success: true, loadTime: loadTime };
  } catch (error) {
    console.error("Error crítico al cargar archivos:", error);
    return {
      success: false,
      error: error.message || "Error desconocido al cargar archivos",
    };
  }
});

// Obtener controlador (para compartir estado)
ipcMain.handle("get-controller", async () => {
  return configController;
});

// ==================== EXCEL 1 (SOURCE) ====================

ipcMain.handle("get-source-filename", async () => {
  return configController.getSourceFile()?.name || "Desconocido";
});

ipcMain.handle("get-source-sheets", async () => {
  return configController.getSourceFile().getSheetNames();
});

ipcMain.handle("set-source-sheet", async (event, sheetName) => {
  configController.setSourceSheet(sheetName);
  return { success: true };
});

ipcMain.handle("set-source-header-row", async (event, rowNumber) => {
  configController.setSourceHeaderRow(rowNumber);
  return { success: true };
});

ipcMain.handle("get-source-preview", async () => {
  return configController.getSourcePreview();
});

ipcMain.handle("get-source-columns", async () => {
  return configController.getSourceColumns();
});

ipcMain.handle("set-source-search-columns", async (event, columnLetters) => {
  configController.setSourceSearchColumns(columnLetters);
  return { success: true };
});

ipcMain.handle("set-source-data-columns", async (event, columnLetters) => {
  configController.setSourceDataColumns(columnLetters);
  return { success: true };
});

ipcMain.handle("validate-source-config", async () => {
  return configController.validateSourceConfig();
});

// ==================== EXCEL 2 (TARGET) ====================

ipcMain.handle("get-target-filename", async () => {
  return configController.getTargetFile()?.name || "Desconocido";
});

ipcMain.handle("get-target-sheets", async () => {
  return configController.getTargetFile().getSheetNames();
});

ipcMain.handle("set-target-sheet", async (event, sheetName) => {
  configController.setTargetSheet(sheetName);
  return { success: true };
});

ipcMain.handle("set-target-header-row", async (event, rowNumber) => {
  configController.setTargetHeaderRow(rowNumber);
  return { success: true };
});

ipcMain.handle("get-target-preview", async () => {
  return configController.getTargetPreview();
});

ipcMain.handle("get-target-columns", async () => {
  return configController.getTargetColumns();
});

ipcMain.handle("set-target-search-columns", async (event, columnLetters) => {
  configController.setTargetSearchColumns(columnLetters);
  return { success: true };
});

ipcMain.handle("set-target-data-columns", async (event, columnLetters) => {
  configController.setTargetDataColumns(columnLetters);
  return { success: true };
});

ipcMain.handle("validate-target-config", async () => {
  return configController.validateTargetConfig();
});

// ==================== PROCESAMIENTO ====================

ipcMain.handle("start-comparison", async (event) => {
  try {
    const sourceFile = configController.getSourceFile();
    const targetFile = configController.getTargetFile();

    const result = await processController.compareFiles(
      sourceFile,
      targetFile,
      (processed, total) => {
        // Enviar progreso a la ventana
        mainWindow.webContents.send("comparison-progress", {
          processed,
          total,
        });

        // Forzar garbage collection cada 1000 filas si está disponible
        if (global.gc && processed % 1000 === 0) {
          global.gc();
        }
      }
    );

    // Limpiar memoria después del procesamiento
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

    // Mostrar diálogo para seleccionar ubicación de guardado
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: "Guardar archivo de resultados",
      defaultPath: path.join(
        app.getPath("documents"),
        `resultado_${Date.now()}.xlsx`
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

    // Calcular tiempo total de procesamiento
    let totalProcessingTime = null;
    if (processingStartTime) {
      const endTime = Date.now();
      totalProcessingTime = ((endTime - processingStartTime) / 1000).toFixed(2); // En segundos
      console.log(
        `⏱️ Tiempo total de procesamiento: ${totalProcessingTime} segundos`
      );
      processingStartTime = null; // Resetear para el próximo proceso
    }

    // Obtener estadísticas
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
      processingTime: totalProcessingTime, // Añadir tiempo de procesamiento
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Abrir archivo de resultados
ipcMain.on("open-result-file", (event, filePath) => {
  shell.openPath(filePath).catch((error) => {
    dialog.showErrorBox(
      "Error",
      `No se pudo abrir el archivo: ${error.message}`
    );
  });
});

// ==================== CATALOGACIÓN ====================

// Seleccionar múltiples archivos de catálogo
ipcMain.handle("select-catalog-files", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Seleccionar archivos de catálogo",
      filters: [
        { name: "Archivos Excel", extensions: ["xlsx", "xls"] },
        { name: "Todos los archivos", extensions: ["*"] },
      ],
      properties: ["openFile", "multiSelections"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, filePaths: [] };
    }

    return {
      success: true,
      filePaths: result.filePaths,
    };
  } catch (error) {
    return { success: false, error: error.message, filePaths: [] };
  }
});

// Procesar archivos de catálogo
ipcMain.handle("process-catalog-files", async (_event, fileConfigs) => {
  try {
    console.log("\n🔄 Iniciando procesamiento de catálogos...");

    // fileConfigs debe ser un array de objetos: [{ filePath, sheetName, columnIndex }, ...]
    const result = await catalogController.processCatalogs(
      fileConfigs,
      (progress) => {
        // Enviar progreso al renderer
        mainWindow.webContents.send("catalog-progress", progress);
      }
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    console.log("✅ Procesamiento completado");
    return {
      success: true,
      stats: result.stats,
    };
  } catch (error) {
    console.error("❌ Error en procesamiento de catálogos:", error);
    return { success: false, error: error.message };
  }
});

// Obtener detalles de errores del catálogo
ipcMain.handle("get-catalog-errors", async () => {
  try {
    const errors = catalogController.getAllErrorDetails();
    return { success: true, errors };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Validar archivos de catálogo sin procesarlos
ipcMain.handle("validate-catalog-files", async (_event, filePaths) => {
  try {
    const CatalogParser = require("./infrastructure/parsers/CatalogParser");
    const validations = await CatalogParser.validateFiles(filePaths);
    return { success: true, validations };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Validar una columna específica de una hoja
ipcMain.handle(
  "validate-catalog-column",
  async (_event, filePath, sheetName, columnIndex) => {
    try {
      const CatalogParser = require("./infrastructure/parsers/CatalogParser");
      const validation = await CatalogParser.validateColumn(
        filePath,
        sheetName,
        columnIndex
      );
      return validation;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
);

// Exportar catálogo procesado
ipcMain.handle("export-catalog", async () => {
  try {
    const catalogResults = catalogController.getCatalogResults();

    if (!catalogResults || catalogResults.results.length === 0) {
      return {
        success: false,
        error: "No hay datos de catálogo para exportar",
      };
    }

    // Mostrar diálogo para guardar
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: "Guardar catálogo procesado",
      defaultPath: path.join(
        app.getPath("documents"),
        `catalogo_${Date.now()}.xlsx`
      ),
      filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
    });

    if (canceled || !filePath) {
      return { success: false, error: "Guardado cancelado" };
    }

    // Exportar a Excel
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();

    // Crear una hoja por cada archivo procesado
    for (const catalogFile of catalogResults.results) {
      if (catalogFile.items && catalogFile.items.length > 0) {
        const sheetName = catalogFile.fileName
          .replace(/\.[^/.]+$/, "")
          .substring(0, 31);
        const worksheet = workbook.addWorksheet(sheetName);

        // Obtener datos planos con orden preservado
        const data = catalogFile.toPlainObjectsWithOrder();

        if (data.length === 0) {
          console.warn(`No hay datos para exportar en ${catalogFile.fileName}`);
          continue;
        }

        // Escribir headers (mantener el orden del primer objeto)
        const headers = Object.keys(data[0]);
        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE6E6FA" },
          };
        });

        // Escribir datos
        data.forEach((row) => {
          const rowData = headers.map((header) => row[header] || "");
          worksheet.addRow(rowData);
        });

        // Ajustar ancho de columnas
        worksheet.columns.forEach((col) => {
          col.width = 20;
        });
      }
    }

    await workbook.xlsx.writeFile(filePath);

    console.log(`✅ Catálogo exportado: ${filePath}`);

    return {
      success: true,
      filePath,
      totalItems: catalogResults.stats.totalItems,
    };
  } catch (error) {
    console.error("❌ Error exportando catálogo:", error);
    return { success: false, error: error.message };
  }
});

// Resetear controlador de catálogo
ipcMain.on("reset-catalog", () => {
  catalogController.reset();
});

// ==================== COMPARACIÓN INTERNA ====================

// Obtener hojas de un archivo Excel
ipcMain.handle("get-excel-sheets", async (event, filePath) => {
  try {
    const sheets = await internalComparisonController.getSheetNames(filePath);
    return { success: true, sheets };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Obtener vista previa de una hoja
ipcMain.handle(
  "get-sheet-preview",
  async (event, filePath, sheetName, headerRow) => {
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

// Iniciar comparación interna
ipcMain.handle("start-internal-comparison", async (event, config) => {
  try {
    processingStartTime = Date.now(); // Iniciar cronómetro

    const result = await internalComparisonController.compareColumns(
      config,
      (processed, total) => {
        mainWindow.webContents.send("internal-comparison-progress", {
          processed,
          total,
        });

        // Forzar garbage collection cada 1000 filas si está disponible
        if (global.gc && processed % 1000 === 0) {
          global.gc();
        }
      }
    );

    // Limpiar memoria después del procesamiento
    if (global.gc) {
      global.gc();
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Generar archivo de resultado de comparación interna
ipcMain.handle("generate-internal-comparison-file", async () => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: "Guardar archivo de resultados",
      defaultPath: path.join(
        app.getPath("documents"),
        `comparacion_interna_${Date.now()}.xlsx`
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

    // Calcular tiempo total de procesamiento
    let totalProcessingTime = null;
    if (processingStartTime) {
      const endTime = Date.now();
      totalProcessingTime = ((endTime - processingStartTime) / 1000).toFixed(2);
      console.log(
        `⏱️ Tiempo total de procesamiento: ${totalProcessingTime} segundos`
      );
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

// ==================== MANEJO DE ERRORES ====================

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  dialog.showErrorBox("Error Crítico", error.message);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
  dialog.showErrorBox("Error Crítico", error.message);
});
