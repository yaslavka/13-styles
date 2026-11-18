import { PrismaClient } from '@prisma/client'

// Единственный PrismaClient на процесс (защита от разрастания коннектов в dev-режиме)
const globalForPrisma = globalThis

const prisma = globalForPrisma.__stylesPrisma ?? new PrismaClient({
  log: ['warn', 'error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__stylesPrisma = prisma
}

export const db = prisma
