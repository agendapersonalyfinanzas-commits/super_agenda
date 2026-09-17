import React from 'react'
import snoopyFoodImg from '../../assets/snoopy-food.png'
import woodstockTravelImg from '../../assets/woodstock-travel.png'
import charlieMarketImg from '../../assets/charlie-market.png'
import snoopyRepairImg from '../../assets/snoopy-repair.png'
import superSnoopyImg from '../../assets/super-snoopy.png'
import lucyAnalyticsImg from '../../assets/lucy-analytics.png'
import snoopyGasolinaImg from '../../assets/snoopy-gasolina.png' // Enlace corregido en limpio

export const PRESET_MAP = {
  'charlie-market': charlieMarketImg,
  'snoopy-repair': snoopyRepairImg,
  'snoopy-food': snoopyFoodImg,
  'woodstock-travel': woodstockTravelImg,
  'super-snoopy': superSnoopyImg,
  'lucy-analytics': lucyAnalyticsImg,
  'gasolina': snoopyGasolinaImg // Conexión directa a tu ilustración
}

export const SnoopyFoodIcon = () => <img src={snoopyFoodImg} alt="C" className="w-full h-full object-cover scale-125 pointer-events-none" />
export const WoodstockTravelIcon = () => <img src={woodstockTravelImg} alt="V" className="w-full h-full object-cover scale-125 pointer-events-none" />
export const CharlieBrownMarketIcon = () => <img src={charlieMarketImg} alt="S" className="w-full h-full object-cover scale-125 pointer-events-none" />
export const SnoopyRepairIcon = () => <img src={snoopyRepairImg} alt="A" className="w-full h-full object-cover scale-125 pointer-events-none" />
export const LucyAnalyticsIcon = () => <img src={lucyAnalyticsImg} alt="M" className="w-full h-full object-contain pointer-events-none" />
export const LinusCalendarIcon = () => <span className="text-xl">📅</span>
