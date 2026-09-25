import { obtenerMensajeError } from './errores.js';

export const KEYS = {
  ACTIVE_USER: 'peanuts_active_user',
  CUSTOM_USERS: 'peanuts_custom_users'
};

export const guardarEnStorage = (clave, valor) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (e) {
    console.error('Error guardando en localStorage:', obtenerMensajeError(e));
  }
};

export const obtenerDeStorage = (clave, valorPorDefecto = null) => {
  try {
    const item = localStorage.getItem(clave);
    return item ? JSON.parse(item) : valorPorDefecto;
  } catch (e) {
    console.error('Error leyendo de localStorage:', obtenerMensajeError(e));
    return valorPorDefecto;
  }
};

export const eliminarDeStorage = (clave) => {
  try {
    localStorage.removeItem(clave);
  } catch (e) {
    console.error('Error eliminando de localStorage:', obtenerMensajeError(e));
  }
};