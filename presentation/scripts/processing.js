const { ipcRenderer } = require("electron");

let processStarted = false;
let processingTimer = null;
let startedAt = null;

document.addEventListener("DOMContentLoaded", async () => {
  document
    .getElementById("newProcessBtn")
    .addEventListener("click", newProcess);
  document.getElementById("openFileBtn").addEventListener("click", openFile);
  document
    .getElementById("errorBackBtn")
    .addEventListener("click", newProcess);

  if (!processStarted) {
    processStarted = true;
    await startComparison();
  }
});

async function startComparison() {
  try {
    resetErrorState();
    startedAt = Date.now();
    startElapsedTimer();
    updateStatus("Preparando comparacion...", 0);
    updateProcessingHint(0);

    const result = await ipcRenderer.invoke("start-comparison");

    if (!result.success) {
      throw new Error(result.error);
    }

    await generateFile();
  } catch (error) {
    showError(error.message);
  }
}

async function generateFile() {
  try {
    updateStatus("Generando archivo de resultados...", 95);
    updateProcessingHint(95);

    const result = await ipcRenderer.invoke("generate-result-file");

    if (!result.success) {
      throw new Error(result.error);
    }

    showResults(result);
  } catch (error) {
    showError(error.message);
  }
}

function updateStatus(message, progress) {
  document.getElementById("statusText").textContent = message;

  const progressBar = document.getElementById("progressBar");
  progressBar.style.width = `${progress}%`;
  progressBar.setAttribute("aria-valuenow", progress);
  progressBar.textContent = `${Math.round(progress)}%`;
}

function updateProcessingHint(progress) {
  const hint = document.getElementById("processingHint");

  if (progress < 15) {
    hint.textContent =
      "Leyendo hojas y construyendo el indice de codigos para acelerar la busqueda.";
    return;
  }

  if (progress < 80) {
    hint.textContent =
      "Comparando filas y aplicando normalizacion flexible de identificadores.";
    return;
  }

  hint.textContent =
    "Cerrando el proceso y preparando el archivo de salida para descarga.";
}

function startElapsedTimer() {
  stopElapsedTimer();
  updateElapsedTime();
  processingTimer = setInterval(updateElapsedTime, 1000);
}

function stopElapsedTimer() {
  if (processingTimer) {
    clearInterval(processingTimer);
    processingTimer = null;
  }
}

function updateElapsedTime() {
  const elapsedElement = document.getElementById("elapsedTimeText");

  if (!startedAt) {
    elapsedElement.textContent = "Tiempo transcurrido: 0 s";
    return;
  }

  const elapsedSeconds = Math.max(
    0,
    Math.round((Date.now() - startedAt) / 1000)
  );
  elapsedElement.textContent = `Tiempo transcurrido: ${elapsedSeconds} s`;
}

function showResults(result) {
  stopElapsedTimer();
  document.getElementById("processingContainer").style.display = "none";

  const summary = document.getElementById("resultSummary");
  summary.classList.add("show");

  document.getElementById("exactMatchesCount").textContent =
    result.exactMatches || 0;
  document.getElementById("noMatchesCount").textContent = result.noMatches || 0;
  document.getElementById("processingTime").textContent = result.processingTime
    ? `${result.processingTime} s`
    : "No disponible";
  document.getElementById("outputPath").textContent = result.filePath;

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
  stopElapsedTimer();
  document.getElementById("spinner").classList.add("d-none");
  document.getElementById("statusText").textContent =
    "No se pudo completar el proceso.";
  document.getElementById("progressBar").classList.remove(
    "progress-bar-animated"
  );
  document.getElementById("progressText").textContent =
    "Revisa el detalle del error y vuelve a intentarlo.";
  document.getElementById("processingHint").textContent =
    "Si el archivo estaba abierto en otra aplicacion o era muy grande, intenta cerrar procesos y repetir la operacion.";

  const errorAlert = document.getElementById("errorAlert");
  errorAlert.textContent = message;
  errorAlert.classList.remove("d-none");
  document.getElementById("errorBackBtn").classList.remove("d-none");
}

function resetErrorState() {
  const errorAlert = document.getElementById("errorAlert");
  errorAlert.textContent = "";
  errorAlert.classList.add("d-none");

  document.getElementById("errorBackBtn").classList.add("d-none");
  document.getElementById("spinner").classList.remove("d-none");
  document
    .getElementById("progressBar")
    .classList.add("progress-bar-animated");
}

ipcRenderer.on("comparison-progress", (_event, data) => {
  const percentage =
    data.total > 0 ? Math.round((data.processed / data.total) * 100) : 0;

  updateStatus(
    `Procesando archivos... ${data.processed} de ${data.total} filas`,
    percentage
  );
  updateProcessingHint(percentage);
  document.getElementById(
    "progressText"
  ).textContent = `Procesadas ${data.processed} de ${data.total} filas`;
});
