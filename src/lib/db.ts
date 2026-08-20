import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || ''

  // Use libsql adapter for Turso (remote) connections
  if (databaseUrl.startsWith('libsql://')) {
    const adapter = new PrismaLibSql({ url: databaseUrl })
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
    })
  }

  // Default: local SQLite
  return new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
  })
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
