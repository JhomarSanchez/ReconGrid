const { ipcRenderer } = require("electron");

let processStarted = false;

document.addEventListener("DOMContentLoaded", async () => {
  if (!processStarted) {
    processStarted = true;
    await startComparison();
  }

  document
    .getElementById("newProcessBtn")
    .addEventListener("click", newProcess);
  document.getElementById("openFileBtn").addEventListener("click", openFile);
});

async function startComparison() {
  try {
    updateStatus("Iniciando comparación...", 0);

    // Iniciar comparación
    const result = await ipcRenderer.invoke("start-comparison");

    if (!result.success) {
      throw new Error(result.error);
    }

    // Generar archivo directamente
    await generateFile();
  } catch (error) {
    showError("Error durante la comparación: " + error.message);
  }
}

async function generateFile() {
  try {
    updateStatus("Generando archivo de resultados...", 95);

    const result = await ipcRenderer.invoke("generate-result-file");

    if (!result.success) {
      throw new Error(result.error);
    }

    // Mostrar resumen de resultados
    showResults(result);
  } catch (error) {
    showError("Error al generar archivo: " + error.message);
  }
}

function updateStatus(message, progress) {
  document.getElementById("statusText").textContent = message;

  const progressBar = document.getElementById("progressBar");
  progressBar.style.width = `${progress}%`;
  progressBar.setAttribute("aria-valuenow", progress);
  progressBar.textContent = `${Math.round(progress)}%`;
}

function showResults(result) {
  // Ocultar indicador de progreso
  document.getElementById("processingContainer").style.display = "none";

  // Mostrar resumen
  const summary = document.getElementById("resultSummary");
  summary.classList.add("show");

  // Llenar estadísticas
  document.getElementById("exactMatchesCount").textContent =
    result.exactMatches || 0;
  document.getElementById("noMatchesCount").textContent = result.noMatches || 0;
  document.getElementById("outputPath").textContent = result.filePath;

  // Guardar ruta para abrir archivo
  window.resultFilePath = result.filePath;
}

function newProcess() {
  ipcRenderer.send("navigate-to", "index");
}

function openFile() {
  if (window.resultFilePath) {
    ipcRenderer.send("open-result-file", window.resultFilePath);
  }
}

function showError(message) {
  alert(message);
  document.getElementById("processingContainer").style.display = "none";
}

// Escuchar actualizaciones de progreso
ipcRenderer.on("comparison-progress", (event, data) => {
  const percentage = Math.round((data.processed / data.total) * 100);
  updateStatus(
    `Procesando archivos... ${data.processed} de ${data.total} filas`,
    percentage
  );
  document.getElementById(
    "progressText"
  ).textContent = `Procesadas ${data.processed} de ${data.total} filas`;
});
