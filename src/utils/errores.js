// src/utils/errores.js

/**
 * Traduce y simplifica errores de Supabase o Javascript
 */
export const obtenerMensajeError = (error) => {
  if (!error) return '';
  
  const mensaje = error.message || error.toString();

  if (mensaje.includes('FetchError') || mensaje.includes('Failed to fetch')) {
    return 'ERROR DE CONEXIÓN. COMPRUEBA TU INTERNET.';
  }
  if (mensaje.includes('invalid input syntax')) {
    return 'POR FAVOR, REVISA LOS DATOS INGRESADOS.';
  }
  if (mensaje.includes('JWT') || mensaje.includes('token')) {
    return 'TU SESIÓN HA EXPIRADO. VUELVE A INICIAR SESIÓN.';
  }

  return mensaje.toUpperCase();
};