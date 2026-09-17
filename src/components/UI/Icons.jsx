// 1. Carga automática dinámica de todas las imágenes .png de public/
const rawModules = import.meta.glob('/public/*.png', { eager: true, import: 'default' });

export const PRESET_MAP = {};
export const PRESETS = [];

Object.entries(rawModules).forEach(([path]) => {
  const fileName = path.split('/').pop();            // ej: "charlie-market.png"
  const key = fileName.replace(/\.[^/.]+$/, '');     // ej: "charlie-market"
  const src = `/${fileName}`;                       // ej: "/charlie-market.png"

  PRESET_MAP[key] = src;
  PRESETS.push({
    key,
    name: key.replace(/-/g, ' ').toUpperCase(),      // ej: "CHARLIE MARKET"
    src
  });
});

// Alias de compatibilidad
if (PRESET_MAP['snoopy-gasolina']) {
  PRESET_MAP['gasolina'] = PRESET_MAP['snoopy-gasolina'];
}

export const PRESET_ICONS = PRESETS;

// 2. Exportaciones individuales nombradas para que pantallas como AnalyticsScreen no fallen
export const LucyAnalyticsIcon = PRESET_MAP['lucy-analytics'] || '/lucy-analytics.png';
export const lucyAnalytics = PRESET_MAP['lucy-analytics'] || '/lucy-analytics.png';

export const CharlieMarketIcon = PRESET_MAP['charlie-market'] || '/charlie-market.png';
export const charlieMarket = PRESET_MAP['charlie-market'] || '/charlie-market.png';

export const SnoopyRepairIcon = PRESET_MAP['snoopy-repair'] || '/snoopy-repair.png';
export const snoopyRepair = PRESET_MAP['snoopy-repair'] || '/snoopy-repair.png';

export const SnoopyFoodIcon = PRESET_MAP['snoopy-food'] || '/snoopy-food.png';
export const snoopyFood = PRESET_MAP['snoopy-food'] || '/snoopy-food.png';

export const WoodstockTravelIcon = PRESET_MAP['woodstock-travel'] || '/woodstock-travel.png';
export const woodstockTravel = PRESET_MAP['woodstock-travel'] || '/woodstock-travel.png';

export const SuperSnoopyIcon = PRESET_MAP['super-snoopy'] || '/super-snoopy.png';
export const superSnoopy = PRESET_MAP['super-snoopy'] || '/super-snoopy.png';

export const SnoopyGasolinaIcon = PRESET_MAP['snoopy-gasolina'] || '/snoopy-gasolina.png';
export const snoopyGasolina = PRESET_MAP['snoopy-gasolina'] || '/snoopy-gasolina.png';

export const FranklinInternetIcon = PRESET_MAP['franklin-internet'] || '/franklin-internet.png';
export const franklinInternet = PRESET_MAP['franklin-internet'] || '/franklin-internet.png';

export const LinusCfeIcon = PRESET_MAP['linus-cfe'] || '/linus-cfe.png';
export const linusCfe = PRESET_MAP['linus-cfe'] || '/linus-cfe.png';

export const LinusDulcesIcon = PRESET_MAP['linus-dulces'] || '/linus-dulces.png';
export const linusDulces = PRESET_MAP['linus-dulces'] || '/linus-dulces.png';

export const LucySecretariaIcon = PRESET_MAP['lucy-secretaria'] || '/lucy-secretaria.png';
export const lucySecretaria = PRESET_MAP['lucy-secretaria'] || '/lucy-secretaria.png';

export const PatyTelcelIcon = PRESET_MAP['paty-telcel'] || '/paty-telcel.png';
export const patyTelcel = PRESET_MAP['paty-telcel'] || '/paty-telcel.png';

export const SallyOficinistaIcon = PRESET_MAP['sally-oficinista'] || '/sally-oficinista.png';
export const sallyOficinista = PRESET_MAP['sally-oficinista'] || '/sally-oficinista.png';

export const SchroederLimonadaIcon = PRESET_MAP['schroeder-limonada'] || '/schroeder-limonada.png';
export const schroederLimonada = PRESET_MAP['schroeder-limonada'] || '/schroeder-limonada.png';

export const SnoopyCaevIcon = PRESET_MAP['snoopy-caev'] || '/snoopy-caev.png';
export const snoopyCaev = PRESET_MAP['snoopy-caev'] || '/snoopy-caev.png';

export const SnoopyMaestroIcon = PRESET_MAP['snoopy-maestro'] || '/snoopy-maestro.png';
export const snoopyMaestro = PRESET_MAP['snoopy-maestro'] || '/snoopy-maestro.png';

export const SnoppyAlquilerIcon = PRESET_MAP['snoppy-alquiler'] || '/snoppy-alquiler.png';
export const snoppyAlquiler = PRESET_MAP['snoppy-alquiler'] || '/snoppy-alquiler.png';

export const WoodstockGasIcon = PRESET_MAP['woodstock-gas'] || '/woodstock-gas.png';
export const woodstockGas = PRESET_MAP['woodstock-gas'] || '/woodstock-gas.png';

export default PRESET_MAP;