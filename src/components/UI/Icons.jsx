import React from 'react'

// Rutas directas apuntando a la carpeta public/
const snoopyFoodImg = '/snoopy-food.png'
const woodstockTravelImg = '/woodstock-travel.png'
const charlieMarketImg = '/charlie-market.png'
const snoopyRepairImg = '/snoopy-repair.png'
const superSnoopyImg = '/super-snoopy.png'
const lucyAnalyticsImg = '/lucy-analytics.png'
const snoopyGasolinaImg = '/snoopy-gasolina.png'

export const PRESET_MAP = {
  'charlie-market': charlieMarketImg,
  'snoopy-repair': snoopyRepairImg,
  'snoopy-food': snoopyFoodImg,
  'woodstock-travel': woodstockTravelImg,
  'super-snoopy': superSnoopyImg,
  'lucy-analytics': lucyAnalyticsImg,
  'gasolina': snoopyGasolinaImg
}

export const SnoopyFoodIcon = () => <img src={snoopyFoodImg} alt="C" className="w-full h-full object-cover scale-125 pointer-events-none" />
export const WoodstockTravelIcon = () => <img src={woodstockTravelImg} alt="V" className="w-full h-full object-cover scale-125 pointer-events-none" />
export const CharlieBrownMarketIcon = () => <img src={charlieMarketImg} alt="S" className="w-full h-full object-cover scale-125 pointer-events-none" />
export const SnoopyRepairIcon = () => <img src={snoopyRepairImg} alt="A" className="w-full h-full object-cover scale-125 pointer-events-none" />
export const LucyAnalyticsIcon = () => <img src={lucyAnalyticsImg} alt="M" className="w-full h-full object-contain pointer-events-none" />
export const LinusCalendarIcon = () => <span className="text-xl">📅</span>