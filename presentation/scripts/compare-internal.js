const { ipcRenderer } = require("electron");

// Estado de la aplicación
const state = {
  filePath: null,
  fileName: null,
  sheetName: null,
  headerRow: 1,
  column1: null,
  column2: null,
  resultColumnName: "Concordancia",
  previewData: null,
  comparisonComplete: false,
};

// Elementos del DOM
const elements = {
  selectFileBtn: document.getElementById("selectFileBtn"),
  fileNameDisplay: document.getElementById("fileNameDisplay"),
  sheetSelect: document.getElementById("sheetSelect"),
  headerRowInput: document.getElementById("headerRowInput"),
  column1Input: document.getElementById("column1Input"),
  column2Input: document.getElementById("column2Input"),
  resultColumnInput: document.getElementById("resultColumnInput"),
  loadPreviewBtn: document.getElementById("loadPreviewBtn"),
  previewTable: document.getElementById("previewTable"),
  previewHeader: document.getElementById("previewHeader"),
  previewBody: document.getElementById("previewBody"),
  col1Badge: document.getElementById("col1Badge"),
  col2Badge: document.getElementById("col2Badge"),
  resultBadge: document.getElementById("resultBadge"),
  processBtn: document.getElementById("processBtn"),
  processHelp: document.getElementById("processHelp"),
  backBtn: document.getElementById("backBtn"),
  backToMenuBtn: document.getElementById("backToMenuBtn"),
  section1: document.getElementById("section1"),
  section2: document.getElementById("section2"),
  section3: document.getElementById("section3"),
  step1: document.getElementById("step1"),
  step2: document.getElementById("step2"),
  step3: document.getElementById("step3"),
};

// Event Listeners
elements.selectFileBtn.addEventListener("click", selectFile);
elements.sheetSelect.addEventListener("change", onSheetChange);
elements.headerRowInput.addEventListener("change", onConfigChange);
elements.column1Input.addEventListener("input", onConfigChange);
elements.column2Input.addEventListener("input", onConfigChange);
elements.resultColumnInput.addEventListener("input", onConfigChange);
elements.loadPreviewBtn.addEventListener("click", loadPreview);
elements.processBtn.addEventListener("click", processComparison);
elements.backBtn.addEventListener("click", () => showSection(2));
elements.backToMenuBtn.addEventListener("click", () => {
  ipcRenderer.send("navigate-to", "mode-selection");
});

// Seleccionar archivo
async function selectFile() {
  try {
    const result = await ipcRenderer.invoke("select-excel-file");

    if (!result.success) {
      return;
    }

    state.filePath = result.filePath;
    state.fileName = result.fileName;

    elements.fileNameDisplay.textContent = result.fileName;
    elements.selectFileBtn.classList.add("btn-success");
    elements.selectFileBtn.textContent = "✓ Archivo Seleccionado";

    // Cargar hojas del archivo
    await loadSheets();

    // Mostrar sección 2
    showSection(2);
  } catch (error) {
    alert(`Error al seleccionar archivo: ${error.message}`);
  }
}

// Cargar hojas del archivo
async function loadSheets() {
  try {
    const result = await ipcRenderer.invoke("get-excel-sheets", state.filePath);

    if (!result.success) {
      throw new Error(result.error);
    }

    // Limpiar y llenar el select de hojas
    elements.sheetSelect.innerHTML =
      '<option value="">-- Selecciona una hoja --</option>';

    result.sheets.forEach((sheet) => {
      const option = document.createElement("option");
      option.value = sheet;
      option.textContent = sheet;
      elements.sheetSelect.appendChild(option);
    });

    // Seleccionar la primera hoja por defecto
    if (result.sheets.length > 0) {
      elements.sheetSelect.value = result.sheets[0];
      state.sheetName = result.sheets[0];
    }
  } catch (error) {
    alert(`Error al cargar hojas: ${error.message}`);
  }
}

// Evento al cambiar de hoja
function onSheetChange() {
  state.sheetName = elements.sheetSelect.value;
  // Ocultar preview si cambió la hoja
  if (state.previewData) {
    hidePreview();
  }
}

// Evento cuando cambia la configuración
function onConfigChange() {
  // Si ya hay una vista previa cargada, ocultarla
  if (state.previewData) {
    hidePreview();
  }
}

// Ocultar vista previa
function hidePreview() {
  elements.section3.style.display = "none";
  state.previewData = null;
  updateSteps(2);

  // Cambiar el texto del botón de carga
  elements.loadPreviewBtn.textContent = "Cargar Vista Previa";
  elements.loadPreviewBtn.classList.remove("btn-success");
  elements.loadPreviewBtn.classList.add("btn-secondary");

  // Deshabilitar el botón de procesar
  elements.processBtn.disabled = true;
  if (elements.processHelp) {
    elements.processHelp.style.display = "block";
  }
}

// Cargar vista previa
async function loadPreview() {
  try {
    // Validar configuración
    if (!state.sheetName) {
      alert("Por favor selecciona una hoja");
      return;
    }

    const col1 = elements.column1Input.value.trim().toUpperCase();
    const col2 = elements.column2Input.value.trim().toUpperCase();

    if (!col1 || !col2) {
      alert("Por favor ingresa las letras de ambas columnas a comparar");
      return;
    }

    if (col1 === col2) {
      alert("Las columnas deben ser diferentes");
      return;
    }

    // Actualizar estado
    state.column1 = col1;
    state.column2 = col2;
    state.headerRow = parseInt(elements.headerRowInput.value) || 1;
    state.resultColumnName = elements.resultColumnInput.value || "Concordancia";

    // Mostrar loading
    elements.loadPreviewBtn.disabled = true;
    elements.loadPreviewBtn.textContent = "Cargando...";

    // Obtener preview
    const result = await ipcRenderer.invoke(
      "get-sheet-preview",
      state.filePath,
      state.sheetName,
      state.headerRow
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    state.previewData = result.preview;

    // Mostrar preview
    renderPreview();

    // Marcar el botón como completado
    elements.loadPreviewBtn.classList.remove("btn-secondary");
    elements.loadPreviewBtn.classList.add("btn-success");
    elements.loadPreviewBtn.textContent = "✓ Vista Previa Cargada";

    // Habilitar el botón de procesar
    elements.processBtn.disabled = false;
    if (elements.processHelp) {
      elements.processHelp.style.display = "none";
    }

    // Mostrar sección 3
    showSection(3);
  } catch (error) {
    alert(`Error al cargar vista previa: ${error.message}`);
  } finally {
    elements.loadPreviewBtn.disabled = false;
    if (!state.previewData) {
      elements.loadPreviewBtn.textContent = "Cargar Vista Previa";
    }
  }
}

// Renderizar vista previa
function renderPreview() {
  const { columns, rows } = state.previewData;

  // Actualizar badges
  elements.col1Badge.textContent = state.column1;
  elements.col2Badge.textContent = state.column2;
  elements.resultBadge.textContent = state.resultColumnName;

  // Limpiar tabla
  elements.previewHeader.innerHTML = "";
  elements.previewBody.innerHTML = "";

  // Crear encabezados
  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = `${col.letter}: ${col.header}`;

    // Resaltar columnas seleccionadas
    if (col.letter === state.column1) {
      th.classList.add("table-primary");
    } else if (col.letter === state.column2) {
      th.classList.add("table-success");
    }

    elements.previewHeader.appendChild(th);
  });

  // Añadir columna de resultado
  const resultTh = document.createElement("th");
  resultTh.textContent = state.resultColumnName;
  resultTh.classList.add("table-warning");
  elements.previewHeader.appendChild(resultTh);

  // Crear filas de datos
  rows.forEach((row) => {
    const tr = document.createElement("tr");

    // Obtener valores de las columnas a comparar
    const col1Index = columnLetterToIndex(state.column1);
    const col2Index = columnLetterToIndex(state.column2);

    const value1 = normalizeValue(row.cells[col1Index]);
    const value2 = normalizeValue(row.cells[col2Index]);

    const comparison = value1 === value2 ? "IGUALES" : "DIFERENTES";

    columns.forEach((col) => {
      const td = document.createElement("td");
      const value = row.cells[col.index];
      td.textContent = value !== null && value !== undefined ? value : "";

      // Resaltar columnas seleccionadas
      if (col.letter === state.column1) {
        td.classList.add("table-primary");
      } else if (col.letter === state.column2) {
        td.classList.add("table-success");
      }

      tr.appendChild(td);
    });

    // Añadir celda de comparación
    const comparisonTd = document.createElement("td");
    comparisonTd.textContent = comparison;
    comparisonTd.classList.add("fw-bold");

    if (comparison === "IGUALES") {
      comparisonTd.classList.add("text-success");
    } else {
      comparisonTd.classList.add("text-danger");
    }

    tr.appendChild(comparisonTd);

    elements.previewBody.appendChild(tr);
  });
}

// Procesar comparación
async function processComparison() {
  try {
    // Confirmar con el usuario
    const confirmed = confirm(
      `¿Estás seguro de procesar la comparación?\n\n` +
        `Archivo: ${state.fileName}\n` +
        `Hoja: ${state.sheetName}\n` +
        `Columna 1: ${state.column1}\n` +
        `Columna 2: ${state.column2}\n` +
        `Resultado: ${state.resultColumnName}`
    );

    if (!confirmed) {
      return;
    }

    // Deshabilitar botón
    elements.processBtn.disabled = true;
    elements.processBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';

    // Configuración para enviar al backend
    const config = {
      filePath: state.filePath,
      sheetName: state.sheetName,
      headerRow: state.headerRow,
      column1: state.column1,
      column2: state.column2,
      resultColumnName: state.resultColumnName,
    };

    // Iniciar comparación
    const result = await ipcRenderer.invoke(
      "start-internal-comparison",
      config
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    // Mostrar estadísticas
    alert(
      `Comparación completada exitosamente!\n\n` +
        `Total de filas: ${result.stats.total}\n` +
        `Iguales: ${result.stats.equal}\n` +
        `Diferentes: ${result.stats.different}`
    );

    // Generar archivo
    await generateFile(result.stats);
  } catch (error) {
    alert(`Error al procesar: ${error.message}`);
  } finally {
    elements.processBtn.disabled = false;
    elements.processBtn.innerHTML = "Procesar Comparación";
  }
}

// Generar archivo de resultado
async function generateFile(stats) {
  try {
    const result = await ipcRenderer.invoke(
      "generate-internal-comparison-file"
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    // Mostrar mensaje de éxito
    const message =
      `¡Archivo generado exitosamente!\n\n` +
      `Ubicación: ${result.filePath}\n` +
      `Tiempo de procesamiento: ${result.processingTime}s\n` +
      `Tiempo de creación: ${result.creationTime}s\n\n` +
      `Estadísticas:\n` +
      `Total: ${stats.total}\n` +
      `Iguales: ${stats.equal}\n` +
      `Diferentes: ${stats.different}`;

    alert(message);

    // Preguntar si desea abrir el archivo
    const openFile = confirm("¿Deseas abrir el archivo?");
    if (openFile) {
      ipcRenderer.send("open-result-file", result.filePath);
    }

    // Volver al menú
    setTimeout(() => {
      ipcRenderer.send("navigate-to", "mode-selection");
    }, 1000);
  } catch (error) {
    alert(`Error al generar archivo: ${error.message}`);
  }
}

// Mostrar sección
function showSection(section) {
  if (section === 1) {
    elements.section1.style.display = "block";
    elements.section2.style.display = "none";
    elements.section3.style.display = "none";
    updateSteps(1);
  } else if (section === 2) {
    elements.section1.style.display = "block";
    elements.section2.style.display = "block";
    elements.section3.style.display = "none";
    updateSteps(2);
  } else if (section === 3) {
    elements.section1.style.display = "block";
    elements.section2.style.display = "block";
    elements.section3.style.display = "block";
    updateSteps(3);
  }
}

// Actualizar indicador de pasos
function updateSteps(currentStep) {
  elements.step1.classList.remove("active", "completed");
  elements.step2.classList.remove("active", "completed");
  elements.step3.classList.remove("active", "completed");

  if (currentStep >= 1) {
    elements.step1.classList.add("completed");
  }
  if (currentStep >= 2) {
    elements.step2.classList.add(currentStep === 2 ? "active" : "completed");
  }
  if (currentStep >= 3) {
    elements.step3.classList.add("active");
  }
}

// Utilidades
function columnLetterToIndex(letter) {
  letter = letter.toUpperCase();
  let index = 0;

  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }

  return index; // Retornar índice base 1 para compatibilidad con ExcelJS
}

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object" && value.formula) {
    return "";
  }

  return value.toString().trim().toUpperCase();
}

// Listener para progreso
ipcRenderer.on("internal-comparison-progress", (event, data) => {
  const { processed, total } = data;
  const percent = ((processed / total) * 100).toFixed(1);
  elements.processBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Procesando... ${percent}%`;
});

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  // Deshabilitar el botón de procesar al inicio
  elements.processBtn.disabled = true;
});
