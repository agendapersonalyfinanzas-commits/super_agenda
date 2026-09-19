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
 * Función para inputs: convierte automáticamente el texto a MAYÚSCULAS mientras escribes,
 * excluyendo automáticamente los campos de correo electrónico.
 * @param {Function} setter - La función set del useState
 */
export const manejarInputMayusculas = (setter) => (e) => {
  if (!e || !e.target) return;
  
  const target = e.target;
  const value = target.value;

  // Detectar si es un campo de correo para permitir minúsculas/mayúsculas normales
  const isEmail = 
    target.type === 'email' || 
    target.name?.toLowerCase().includes('email') || 
    target.name?.toLowerCase().includes('correo');

  const finalValue = isEmail ? value : value.toUpperCase();

  if (typeof setter === 'function') {
    setter(finalValue);
  }
};