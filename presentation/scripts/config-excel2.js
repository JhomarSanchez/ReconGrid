const { ipcRenderer } = require("electron");

let controller = null;
let selectedSearchColumns = new Set();
let selectedDataColumns = new Set();

// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
  controller = await ipcRenderer.invoke("get-controller");

  const fileName = await ipcRenderer.invoke("get-target-filename");
  document.getElementById("fileName").textContent = fileName;

  loadSheets();

  document
    .getElementById("sheetSelect")
    .addEventListener("change", onSheetChange);
  document
    .getElementById("headerRowSelect")
    .addEventListener("change", onHeaderRowChange);
  document.getElementById("backBtn").addEventListener("click", goBack);
  document.getElementById("processBtn").addEventListener("click", startProcess);
  document
    .getElementById("selectAllDataBtn")
    .addEventListener("click", selectAllDataColumns);
  document.getElementById("backToMenuBtn").addEventListener("click", () => {
    ipcRenderer.send("navigate-to", "mode-selection");
  });
});

async function loadSheets() {
  try {
    const sheets = await ipcRenderer.invoke("get-target-sheets");
    const select = document.getElementById("sheetSelect");

    sheets.forEach((sheet) => {
      const option = document.createElement("option");
      option.value = sheet;
      option.textContent = sheet;
      select.appendChild(option);
    });

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
    await ipcRenderer.invoke("set-target-sheet", sheetName);
    await updatePreview();
    await loadColumns();
  } catch (error) {
    showError("Error al cambiar de hoja: " + error.message);
  }
}

async function onHeaderRowChange() {
  const headerRow = document.getElementById("headerRowSelect").value;

  try {
    await ipcRenderer.invoke("set-target-header-row", headerRow);
    await updatePreview();
    await loadColumns();
  } catch (error) {
    showError("Error al cambiar fila de encabezados: " + error.message);
  }
}

async function updatePreview() {
  try {
    const preview = await ipcRenderer.invoke("get-target-preview");
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

  const columns = Object.keys(preview[0].data);

  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });

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
    const columns = await ipcRenderer.invoke("get-target-columns");
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
    const searchItem = createColumnCheckbox(
      column,
      "search",
      selectedSearchColumns.has(column.letter)
    );
    searchContainer.appendChild(searchItem);

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
  ipcRenderer.send("navigate-to", "config-excel1");
}

async function startProcess() {
  if (selectedSearchColumns.size === 0) {
    showError("Debe seleccionar al menos una columna de búsqueda");
    return;
  }

  if (selectedDataColumns.size === 0) {
    showError("Debe seleccionar al menos una columna de datos");
    return;
  }

  try {
    await ipcRenderer.invoke(
      "set-target-search-columns",
      Array.from(selectedSearchColumns)
    );
    await ipcRenderer.invoke(
      "set-target-data-columns",
      Array.from(selectedDataColumns)
    );

    const validation = await ipcRenderer.invoke("validate-target-config");

    if (!validation.valid) {
      showError(validation.message);
      return;
    }

    // Navegar a página de procesamiento
    ipcRenderer.send("navigate-to", "processing");
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
