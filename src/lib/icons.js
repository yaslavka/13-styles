'use client'

import { Shirt, Sparkles, Footprints, Watch, Package, Heart } from 'lucide-react'

// Маппинг имён иконок категорий (хранятся строкой в БД) на компоненты Lucide

const ICONS = {
  Shirt,
  Sparkles,
  Footprints,
  Watch,
  Package,
  Heart,
}

const categoryIcon = (name, fallback = 'Package') => ICONS[name] || ICONS[fallback]

const ICONS_MAP = { ICONS, categoryIcon }

export default ICONS_MAP
