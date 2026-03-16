import { PrismaClient } from '@prisma/client'

async function testConnection(url: string, label: string) {
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  })
  try {
    console.log(`Testing ${label}...`)
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log(`${label} SUCCESS:`, result)
  } catch (err: any) {
    console.error(`${label} FAILED:`, err.message)
  } finally {
    await prisma.$disconnect()
  }
}

const POOL_URL = 'postgresql://postgres.wvytuozhzsozcovngzni:%40Leoncito123@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
const DIRECT_URL = 'postgresql://postgres.wvytuozhzsozcovngzni:%40Leoncito123@aws-1-us-east-1.pooler.supabase.com:5432/postgres?connect_timeout=10'

async function main() {
  await testConnection(POOL_URL, 'POOLER (6543)')
  await testConnection(DIRECT_URL, 'DIRECT (5432)')
}

main()
