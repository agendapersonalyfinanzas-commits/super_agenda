// src/services/financialDB.js

const STORAGE_KEY_MERCHANTS = 'super_agenda_custom_merchants';

// Base de conocimientos inicial por defecto para comercios comunes
const DEFAULT_MERCHANTS = {
  'OXXO': 'ALIMENTOS',
  'WALMART': 'SUPERMERCADO',
  'CHEDRAUI': 'SUPERMERCADO',
  'SORIANA': 'SUPERMERCADO',
  'SUPERAMA': 'SUPERMERCADO',
  'FARMACIA': 'SALUD',
  'UBER': 'TRANSPORTE',
  'DIDI': 'TRANSPORTE',
  'SPOTIFY': 'ENTRETENIMIENTO',
  'NETFLIX': 'ENTRETENIMIENTO',
  'CFE': 'SERVICIOS',
  'GASOLINERA': 'TRANSPORTE',
  'PEMEX': 'TRANSPORTE',
  'STARBUCKS': 'ALIMENTOS'
};

/**
 * Obtiene el mapa de comercios guardados combinando los valores por defecto 
 * con los aprendizajes personalizados del usuario.
 */
export const getLearnedMerchants = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MERCHANTS);
    return stored ? { ...DEFAULT_MERCHANTS, ...JSON.parse(stored) } : DEFAULT_MERCHANTS;
  } catch (error) {
    console.error('Error al leer comercios aprendidos:', error);
    return DEFAULT_MERCHANTS;
  }
};

/**
 * Enseña a la app un nuevo comercio o actualiza la categoría de uno existente.
 * @param {string} merchantName Nombre del comercio (ej: "Italian Coffee")
 * @param {string} category Categoría asociada (ej: "ALIMENTOS")
 */
export const learnMerchantCategory = (merchantName, category) => {
  if (!merchantName || !category) return;
  
  try {
    const currentMerchants = getLearnedMerchants();
    currentMerchants[merchantName.toUpperCase().trim()] = category.toUpperCase().trim();
    localStorage.setItem(STORAGE_KEY_MERCHANTS, JSON.stringify(currentMerchants));
    console.log(`🧠 Aprendizaje guardado: ${merchantName} -> ${category}`);
  } catch (error) {
    console.error('Error al guardar nuevo aprendizaje:', error);
  }
};