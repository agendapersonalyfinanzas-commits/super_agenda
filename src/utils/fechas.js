// src/utils/fechas.js

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD para inputs de tipo date
 */
export const fechaHoyInput = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Convierte una fecha ISO a texto legible (ej: "16 SEP 2026")
 */
export const formatearFechaCorta = (fechaISO) => {
  if (!fechaISO) return '';
  const fecha = new Date(fechaISO);
  return fecha
    .toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase(); // Para mantener el estilo en MAYÚSCULAS
};