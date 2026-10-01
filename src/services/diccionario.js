/**
 * 🏢 Diccionario Canónico Masivo y Ampliado para México (Supermercados, Gasolineras, Comida Rápida, Tiendas y Servicios)
 */
export const CANONICAL_MERCHANTS = [
  // --- SUPERMERCADOS Y CLUBES DE PRECIOS ---
  {
    canonical: 'CHEDRAUI',
    category: 'SUPERMERCADO',
    aliases: ['CHEDRAUI', 'CHEDRAHUI', 'CHEDRAUT', 'CHEDRAU', 'TIENDAS CHEDRAUI', 'SUPER CHE', 'SELECTO CHEDRAUI']
  },
  {
    canonical: 'WALMART',
    category: 'SUPERMERCADO',
    aliases: ['WALMART', 'WAL MART', 'BODEGA AURRERA', 'AURRERA', 'EXPRESS AURRERA', 'SUPERAMA', 'BODEGA AURRERA EXPRESS']
  },
  {
    canonical: 'SORIANA',
    category: 'SUPERMERCADO',
    aliases: ['SORIANA', 'HIPER SORIANA', 'SORIANA HIERRO', 'SORIANA EXPRESS', 'SUPER CITY', 'CITY CLUB', 'SORIANA SÚPER']
  },
  {
    canonical: 'LA COMER',
    category: 'SUPERMERCADO',
    aliases: ['LA COMER', 'FRESKO', 'CITY MARKET', 'MEGA LA COMER', 'COMERCIAL MEXICANA']
  },
  {
    canonical: 'HEB',
    category: 'SUPERMERCADO',
    aliases: ['HEB', 'H.E.B.', 'SUPER MERCADOS HEB']
  },
  {
    canonical: 'SAM\'S CLUB',
    category: 'SUPERMERCADO',
    aliases: ['SAMS CLUB', 'SAM\'S CLUB', 'SAMS', 'SAM', 'CLUB SAMS']
  },
  {
    canonical: 'COSTCO',
    category: 'SUPERMERCADO',
    aliases: ['COSTCO', 'COSTCO WHOLESALE']
  },

  // --- SALUD Y FARMACIAS ---
  {
    canonical: 'FARMACIAS GUADALAJARA',
    category: 'SALUD',
    aliases: ['FARMACIAS GUADALAJARA', 'FARMACIA GUADALAJARA', 'FARMACIAS GDL', 'PUNTO GDL']
  },
  {
    canonical: 'FARMACIAS DEL AHORRO',
    category: 'SALUD',
    aliases: ['FARMACIAS DEL AHORRO', 'FARMACIA DEL AHORRO', 'DEL AHORRO']
  },
  {
    canonical: 'FARMACIAS SIMILARES',
    category: 'SALUD',
    aliases: ['FARMACIAS SIMILARES', 'FARMACIA SIMILARES', 'DR SIMI', 'FARMACIAS DE LOS SIMILARES']
  },
  {
    canonical: 'FARMACIAS BENAVIDES',
    category: 'SALUD',
    aliases: ['FARMACIAS BENAVIDES', 'FARMACIA BENAVIDES']
  },
  {
    canonical: 'FARMACIAS YZA',
    category: 'SALUD',
    aliases: ['FARMACIAS YZA', 'YZA']
  },

  // --- TRANSPORTE Y GASOLINERAS ---
  {
    canonical: 'PEMEX',
    category: 'TRANSPORTE',
    aliases: ['PEMEX', 'PETROLEOS MEXICANOS', 'GASOLINERA PEMEX']
  },
  {
    canonical: 'OXXO GAS',
    category: 'TRANSPORTE',
    aliases: ['OXXO GAS', 'CADENA COMERCIAL OXXO GAS', 'GASOLINERA OXXO']
  },
  {
    canonical: 'REPSOL',
    category: 'TRANSPORTE',
    aliases: ['REPSOL', 'GASOLINERA REPSOL']
  },
  {
    canonical: 'MOBIL',
    category: 'TRANSPORTE',
    aliases: ['MOBIL', 'GASOLINERA MOBIL', 'EXXONMOBIL']
  },
  {
    canonical: 'G500',
    category: 'TRANSPORTE',
    aliases: ['G500', 'GRUPO G500', 'GASOLINERA G500']
  },
  {
    canonical: 'BP',
    category: 'TRANSPORTE',
    aliases: ['BP', 'GASOLINERA BP']
  },
  {
    canonical: 'SHELL',
    category: 'TRANSPORTE',
    aliases: ['SHELL', 'GASOLINERA SHELL']
  },

  // --- TIENDAS DE CONVENIENCIA Y CAFETERÍAS ---
  {
    canonical: 'OXXO',
    category: 'ALIMENTOS',
    aliases: ['OXXO', 'CADENA COMERCIAL OXXO']
  },
  {
    canonical: '7-ELEVEN',
    category: 'ALIMENTOS',
    aliases: ['7-ELEVEN', 'SEVEN ELEVEN', '7 ELEVEN']
  },
  {
    canonical: 'CIRCLE K',
    category: 'ALIMENTOS',
    aliases: ['CIRCLE K', 'CIRCLEK', 'EXTRA']
  },
  {
    canonical: 'LA PARROQUIA',
    category: 'ALIMENTOS',
    aliases: ['LA PARROQUIA', 'CAFE LA PARROQUIA', 'GRAN CAFE DE LA PARROQUIA']
  },
  {
    canonical: 'CAFFENIO',
    category: 'ALIMENTOS',
    aliases: ['CAFFENIO', 'CAFE ANDRADE', 'CAFÉ ANDRADE']
  },
  {
    canonical: 'STARBUCKS',
    category: 'ALIMENTOS',
    aliases: ['STARBUCKS', 'STARBUCKS COFFEE']
  },
  {
    canonical: 'KRISPY KREME',
    category: 'ALIMENTOS',
    aliases: ['KRISPY KREME', 'KRISPY']
  },

  // --- RESTAURANTES Y COMIDA RÁPIDA ---
  {
    canonical: 'SANBORNS',
    category: 'ALIMENTOS',
    aliases: ['SANBORNS', 'SAMBORNS', 'CAFE SANBORNS']
  },
  {
    canonical: 'SUSHI GO',
    category: 'ALIMENTOS',
    aliases: ['SUSHI GO', 'SUSHIITO', 'SUSHI ROLL', 'SUSHI']
  },
  {
    canonical: 'MCDONALD\'S',
    category: 'ALIMENTOS',
    aliases: ['MCDONALDS', 'MCDONALD\'S', 'MACDONALDS']
  },
  {
    canonical: 'BURGER KING',
    category: 'ALIMENTOS',
    aliases: ['BURGER KING', 'BK']
  },
  {
    canonical: 'SUBWAY',
    category: 'ALIMENTOS',
    aliases: ['SUBWAY']
  },
  {
    canonical: 'PIZZA HUT',
    category: 'ALIMENTOS',
    aliases: ['PIZZA HUT']
  },
  {
    canonical: 'DOMINO\'S PIZZA',
    category: 'ALIMENTOS',
    aliases: ['DOMINOS PIZZA', 'DOMINO\'S', 'DOMINOS']
  },
  {
    canonical: 'CARL\'S JR',
    category: 'ALIMENTOS',
    aliases: ['CARLS JR', 'CARL\'S JR', 'CARLS']
  },
  {
    canonical: 'LITTLE CAESARS',
    category: 'ALIMENTOS',
    aliases: ['LITTLE CAESARS', 'LITTLE CAESAR\'S', 'LITTLECAESARS']
  },
  {
    canonical: 'PAPA JOHN\'S',
    category: 'ALIMENTOS',
    aliases: ['PAPA JOHNS', 'PAPA JOHN\'S']
  },
  {
    canonical: 'KFC',
    category: 'ALIMENTOS',
    aliases: ['KFC', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY']
  },
  {
    canonical: 'EL POLLO LOCO',
    category: 'ALIMENTOS',
    aliases: ['EL POLLO LOCO', 'POLLO LOCO']
  },

  // --- ENTRETENIMIENTO ---
  {
    canonical: 'CINÉPOLIS',
    category: 'ENTRETENIMIENTO',
    aliases: ['CINEPOLIS', 'CINÉPOLIS', 'CINEMAS CINEPOLIS']
  },
  {
    canonical: 'CINEMEX',
    category: 'ENTRETENIMIENTO',
    aliases: ['CINEMEX']
  },

  // --- TIENDAS DEPARTAMENTALES Y COMPRAS ---
  {
    canonical: 'LIVERPOOL',
    category: 'COMPRAS',
    aliases: ['LIVERPOOL', 'EL PUERTO DE LIVERPOOL', 'FABRICAS DE FRANCIA']
  },
  {
    canonical: 'PALACIO DE HIERRO',
    category: 'COMPRAS',
    aliases: ['PALACIO DE HIERRO', 'EL PALACIO DE HIERRO']
  },
  {
    canonical: 'SUBURBIA',
    category: 'COMPRAS',
    aliases: ['SUBURBIA']
  },
  {
    canonical: 'SEARS',
    category: 'COMPRAS',
    aliases: ['SEARS']
  },
  {
    canonical: 'COPPEL',
    category: 'COMPRAS',
    aliases: ['COPPEL']
  },
  {
    canonical: 'ELEKTRA',
    category: 'COMPRAS',
    aliases: ['ELEKTRA', 'TIENDAS ELEKTRA']
  },
  {
    canonical: 'OFFICE DEPOT',
    category: 'COMPRAS',
    aliases: ['OFFICE DEPOT', 'OFFICEDEPOT', 'OFFICEMAX']
  },

  // --- SERVICIOS BÁSICOS ---
  {
    canonical: 'CFE',
    category: 'SERVICIOS',
    aliases: ['CFE', 'COMISION FEDERAL DE ELECTRICIDAD', 'CFE SUMINISTRO BASICO']
  },
  {
    canonical: 'TELMEX',
    category: 'SERVICIOS',
    aliases: ['TELMEX', 'TELEFONOS DE MEXICO', 'INFONET']
  },
  {
    canonical: 'TOTALPLAY',
    category: 'SERVICIOS',
    aliases: ['TOTALPLAY', 'TOTAL PLAY']
  },
  {
    canonical: 'IZZI',
    category: 'SERVICIOS',
    aliases: ['IZZI', 'IZZI TELECOM']
  },
  {
    canonical: 'MEGACABLE',
    category: 'SERVICIOS',
    aliases: ['MEGACABLE']
  }
];

export function resolveCanonicalMerchant(rawOcrText) {
  if (!rawOcrText) return { name: 'COMPRA GENERAL', category: 'OTROS' };
  const upperText = rawOcrText.toUpperCase();

  for (const merchant of CANONICAL_MERCHANTS) {
    for (const alias of merchant.aliases) {
      if (upperText.includes(alias)) {
        return { name: merchant.canonical, category: merchant.category };
      }
    }
  }

  let cleanName = upperText.split(',')[0].replace(/S\.?A\.? DE C\.?V\.?|R\.?F\.?C\.?/g, '').trim();
  if (cleanName.length > 30) cleanName = cleanName.substring(0, 30);

  return { name: cleanName || 'COMPRA GENERAL', category: 'OTROS' };
}