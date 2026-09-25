// 1. Mapa y lista completa de presets incluyendo todos los recursos de la carpeta public
export const PRESET_MAP = {
  'charlie-market': '/charlie-market.png',
  'finanzas': '/finanzas.png',
  'franklin-internet': '/franklin-internet.png',
  'gastos-medicos': '/gastos-medicos.png',
  'joe-cool-woodstock': '/joe-cool-woodstock.png',
  'joe-linus': '/joe-linus.png',
  'joe-marcie': '/joe-marcie.png',
  'joe-pepermint': '/joe-pepermint.png',
  'joe-pigpen': '/joe-pigpen.png',
  'joe-schoader': '/joe-schoader.png',
  'joe-snoopy': '/joe-snoopy.png',
  'joe-woodstock': '/joe-woodstock.png',
  'juego-baron-rojo': '/juego-baron-rojo.png',
  'juego-franklin': '/juego-franklin.png',
  'juego-linus': '/juego-linus.png',
  'juego-paty': '/juego-paty.png',
  'juego-pigpen': '/juego-pigpen.png',
  'juego-sally': '/juego-sally.png',
  'juego-schroader': '/juego-schroader.png',
  'juego-snoopy-rojo-1': '/juego-snoopy-rojo-1.png',
  'juego-woodstock-piloto': '/juego-woodstock-piloto.png',
  'juego-woodstock': '/juego-woodstock.png',
  'juegol-linus': '/juegol-linus.png',
  'linus-cfe': '/linus-cfe.png',
  'linus-dulces': '/linus-dulces.png',
  'lucy-analytics': '/lucy-analytics.png',
  'lucy-colegiatura': '/lucy-colegiatura.png',
  'lucy-secretaria': '/lucy-secretaria.png',
  'marcia-cita-medica': '/marcia-cita-medica.png',
  'metricas': '/metricas.png',
  'paty-telcel': '/paty-telcel.png',
  'schroeder-limonada': '/schroeder-limonada.png',
  'snoopy-caev': '/snoopy-caev.png',
  'snoopy-food': '/snoopy-food.png',
  'snoopy-gasolina': '/snoopy-gasolina.png',
  'snoopy-maestro': '/snoopy-maestro.png',
  'snoopy-mucama': '/snoopy-mucama.png',
  'snoopy-repair': '/snoopy-repair.png',
  'snoppy-alquiler': '/snoppy-alquiler.png',
  'super-snoopy': '/super-snoopy.png',
  'woodstock-travel': '/woodstock-travel.png',
  'woodstock-gas': '/woodstock-gas.png'
};

export const PRESETS = Object.entries(PRESET_MAP).map(([key, src]) => ({
  key,
  name: key.replace(/-/g, ' ').toUpperCase(),
  src
}));

// Aliases de compatibilidad
if (PRESET_MAP['snoopy-gasolina']) {
  PRESET_MAP['gasolina'] = PRESET_MAP['snoopy-gasolina'];
}

export const PRESET_ICONS = PRESETS;

// 2. Exportaciones individuales nombradas
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

export const SnoopyMucamaIcon = PRESET_MAP['snoopy-mucama'] || '/snoopy-mucama.png';
export const snoopyMucama = PRESET_MAP['snoopy-mucama'] || '/snoopy-mucama.png';

export const SnoopyAlquilerIcon = PRESET_MAP['snoopy-alquiler'] || '/snoopy-alquiler.png';
export const snoopyAlquiler = PRESET_MAP['snoopy-alquiler'] || '/snoopy-alquiler.png';

export const WoodstockGasIcon = PRESET_MAP['woodstock-gas'] || '/woodstock-gas.png';
export const woodstockGas = PRESET_MAP['woodstock-gas'] || '/woodstock-gas.png';

export default PRESET_MAP;