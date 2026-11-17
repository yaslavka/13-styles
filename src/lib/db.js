import { PrismaClient } from '@prisma/client'

// Единственный PrismaClient на процесс (защита от разрастания коннектов в dev-режиме)
const globalForPrisma = globalThis

const prisma = globalForPrisma.__pixartPrisma ?? new PrismaClient({
  log: ['warn', 'error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__pixartPrisma = prisma
}

export const db = prisma
