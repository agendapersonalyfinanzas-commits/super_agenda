// src/utils/moneda.js

/**
 * Convierte un número a formato de moneda (ej: 1250.5 -> "$1,250.50")
 */
export const formatearMoneda = (cantidad) => {
  const num = Number(cantidad) || 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(num);
};

/**
 * Limpia un input de texto y lo convierte a número flotante seguro para Supabase
 */
export const aNumero = (valor) => {
  if (!valor) return 0;
  const limpio = valor.toString().replace(/[^0-9.-]+/g, '');
  return parseFloat(limpio) || 0;
};