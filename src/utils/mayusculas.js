// src/utils/mayusculas.js

/**
 * Convierte cualquier texto a MAYÚSCULAS de forma segura
 * @param {string} texto - El texto a convertir
 * @returns {string} Texto formateado en mayúsculas
 */
export const aMayusculas = (texto) => {
  if (!texto) return '';
  return texto.toString().toUpperCase();
};

/**
 * Función para inputs: convierte automáticamente el texto a MAYÚSCULAS mientras escribes
 * @param {Function} setter - La función set del useState (ej. setCustomName)
 */
export const manejarInputMayusculas = (setter) => (e) => {
  setter(e.target.value.toUpperCase());
};