function extractMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error.trim();
  if (typeof error.message === "string") return error.message.trim();
  return String(error).trim();
}

function formatUserError(error, fallbackMessage) {
  const message = extractMessage(error);
  if (!message) {
    return fallbackMessage;
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("guardado cancelado")) {
    return "No se guardo ningun archivo. Puedes volver a intentarlo cuando quieras.";
  }

  if (
    normalized.includes("archivo no cargado") ||
    normalized.includes("no se encontro el archivo") ||
    normalized.includes("el archivo no existe")
  ) {
    return "No se pudo acceder al archivo seleccionado. Verifica la ruta e intenta de nuevo.";
  }

  if (
    normalized.includes("permiso denegado") ||
    normalized.includes("eacces") ||
    normalized.includes("eperm")
  ) {
    return "No hay permisos suficientes para leer o guardar el archivo en esa ubicacion.";
  }

  if (
    normalized.includes("memoria insuficiente") ||
    normalized.includes("invalid string length") ||
    normalized.includes("cannot create a string longer") ||
    normalized.includes("enomem")
  ) {
    return "El archivo requiere mas memoria de la disponible. Cierra otras aplicaciones o trabaja con una hoja mas acotada.";
  }

  if (
    normalized.includes("hoja no seleccionada") ||
    (normalized.includes("la hoja") && normalized.includes("no existe"))
  ) {
    return "La hoja seleccionada ya no esta disponible. Vuelve a elegir la hoja antes de continuar.";
  }

  if (
    normalized.includes("columnas de busqueda no seleccionadas") ||
    normalized.includes("columnas de datos no seleccionadas")
  ) {
    return "Falta completar la seleccion de columnas requerida para continuar.";
  }

  if (normalized.includes("no hay resultados")) {
    return "Todavia no hay resultados listos para exportar. Ejecuta la comparacion antes de guardar.";
  }

  return fallbackMessage ? `${fallbackMessage} ${message}` : message;
}

module.exports = {
  formatUserError,
};
