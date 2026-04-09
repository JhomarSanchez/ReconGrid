const { ipcRenderer } = require("electron");

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("uploadForm")
    .addEventListener("submit", handleSubmit);
});

async function handleSubmit(e) {
  e.preventDefault();

  const file1Input = document.getElementById("file1");
  const file2Input = document.getElementById("file2");

  const file1 = file1Input.files[0];
  const file2 = file2Input.files[0];

  if (!file1 || !file2) {
    alert("Por favor selecciona ambos archivos Excel.");
    return;
  }

  try {
    // Enviar archivos al proceso principal
    const result = await ipcRenderer.invoke("load-excel-files", {
      file1Path: file1.path,
      file2Path: file2.path,
    });

    if (result.success) {
      // Navegar a configuración del primer excel
      ipcRenderer.send("navigate-to", "config-excel1");
    } else {
      alert("Error al cargar archivos: " + result.error);
    }
  } catch (error) {
    alert("Error: " + error.message);
  }
}
