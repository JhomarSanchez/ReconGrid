const { ipcRenderer } = require("electron");
const ExcelConfigController = require("../controllers/ExcelConfigController");

let controller = null;
let selectedSearchColumns = new Set();
let selectedDataColumns = new Set();

// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
  // Recibir el controlador compartido
  controller = await ipcRenderer.invoke("get-controller");

  // Cargar información del archivo
  const fileName = await ipcRenderer.invoke("get-source-filename");
  document.getElementById("fileName").textContent = fileName;

  // Cargar hojas disponibles
  loadSheets();

  // Event listeners
  document
    .getElementById("sheetSelect")
    .addEventListener("change", onSheetChange);
  document
    .getElementById("headerRowSelect")
    .addEventListener("change", onHeaderRowChange);
  document.getElementById("backBtn").addEventListener("click", goBack);
  document.getElementById("nextBtn").addEventListener("click", goNext);
  document
    .getElementById("selectAllDataBtn")
    .addEventListener("click", selectAllDataColumns);
  document.getElementById("backToMenuBtn").addEventListener("click", () => {
    ipcRenderer.send("navigate-to", "mode-selection");
  });
});

async function loadSheets() {
  try {
    const sheets = await ipcRenderer.invoke("get-source-sheets");
    const select = document.getElementById("sheetSelect");

    sheets.forEach((sheet) => {
      const option = document.createElement("option");
      option.value = sheet;
      option.textContent = sheet;
      select.appendChild(option);
    });

    // Seleccionar primera hoja por defecto
    if (sheets.length > 0) {
      select.value = sheets[0];
      await onSheetChange();
    }
  } catch (error) {
    showError("Error al cargar las hojas: " + error.message);
  }
}

async function onSheetChange() {
  const sheetName = document.getElementById("sheetSelect").value;
  if (!sheetName) return;

  try {
    await ipcRenderer.invoke("set-source-sheet", sheetName);
    await updatePreview();
    await loadColumns();
  } catch (error) {
    showError("Error al cambiar de hoja: " + error.message);
  }
}

async function onHeaderRowChange() {
  const headerRow = document.getElementById("headerRowSelect").value;

  try {
    await ipcRenderer.invoke("set-source-header-row", headerRow);
    await updatePreview();
    await loadColumns();
  } catch (error) {
    showError("Error al cambiar fila de encabezados: " + error.message);
  }
}

async function updatePreview() {
  try {
    const preview = await ipcRenderer.invoke("get-source-preview");
    renderPreview(preview);
  } catch (error) {
    showError("Error al actualizar vista previa: " + error.message);
  }
}

function renderPreview(preview) {
  const headerRow = document.getElementById("previewHeader");
  const bodyTable = document.getElementById("previewBody");

  headerRow.innerHTML = "";
  bodyTable.innerHTML = "";

  if (preview.length === 0) return;

  // Obtener columnas del primer registro
  const columns = Object.keys(preview[0].data);

  // Renderizar encabezados
  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });

  // Renderizar filas
  preview.forEach((row) => {
    const tr = document.createElement("tr");
    columns.forEach((col) => {
      const td = document.createElement("td");
      td.textContent = row.data[col] || "";
      tr.appendChild(td);
    });
    bodyTable.appendChild(tr);
  });
}

async function loadColumns() {
  try {
    const columns = await ipcRenderer.invoke("get-source-columns");
    renderColumnSelectors(columns);
  } catch (error) {
    showError("Error al cargar columnas: " + error.message);
  }
}

function renderColumnSelectors(columns) {
  const searchContainer = document.getElementById("searchColumnsContainer");
  const dataContainer = document.getElementById("dataColumnsContainer");

  searchContainer.innerHTML = "";
  dataContainer.innerHTML = "";

  columns.forEach((column) => {
    // Selector de columnas de búsqueda
    const searchItem = createColumnCheckbox(
      column,
      "search",
      selectedSearchColumns.has(column.letter)
    );
    searchContainer.appendChild(searchItem);

    // Selector de columnas de datos
    const dataItem = createColumnCheckbox(
      column,
      "data",
      selectedDataColumns.has(column.letter)
    );
    dataContainer.appendChild(dataItem);
  });
}

function createColumnCheckbox(column, type, checked) {
  const div = document.createElement("div");
  div.className = "column-item";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "form-check-input me-2";
  checkbox.id = `${type}-${column.letter}`;
  checkbox.value = column.letter;
  checkbox.checked = checked;

  checkbox.addEventListener("change", (e) => {
    if (type === "search") {
      if (e.target.checked) {
        selectedSearchColumns.add(column.letter);
      } else {
        selectedSearchColumns.delete(column.letter);
      }
    } else {
      if (e.target.checked) {
        selectedDataColumns.add(column.letter);
      } else {
        selectedDataColumns.delete(column.letter);
      }
    }
  });

  const label = document.createElement("label");
  label.className = "form-check-label";
  label.htmlFor = checkbox.id;
  label.textContent = `${column.letter}: ${
    column.header || "(Sin encabezado)"
  }`;

  div.appendChild(checkbox);
  div.appendChild(label);

  return div;
}

function goBack() {
  ipcRenderer.send("navigate-to", "index");
}

async function goNext() {
  // Validar selecciones
  if (selectedSearchColumns.size === 0) {
    showError("Debe seleccionar al menos una columna de búsqueda");
    return;
  }

  if (selectedDataColumns.size === 0) {
    showError("Debe seleccionar al menos una columna de datos");
    return;
  }

  try {
    // Guardar configuración
    await ipcRenderer.invoke(
      "set-source-search-columns",
      Array.from(selectedSearchColumns)
    );
    await ipcRenderer.invoke(
      "set-source-data-columns",
      Array.from(selectedDataColumns)
    );

    // Validar configuración
    const validation = await ipcRenderer.invoke("validate-source-config");

    if (!validation.valid) {
      showError(validation.message);
      return;
    }

    // Navegar a configuración del segundo excel
    ipcRenderer.send("navigate-to", "config-excel2");
  } catch (error) {
    showError("Error al guardar configuración: " + error.message);
  }
}

function selectAllDataColumns() {
  const checkboxes = document.querySelectorAll(
    '#dataColumnsContainer input[type="checkbox"]'
  );
  checkboxes.forEach((checkbox) => {
    checkbox.checked = true;
    selectedDataColumns.add(checkbox.value);
  });
}

function showError(message) {
  alert(message);
}
