import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('[API Test DB] Testing connection...')
    const result = await prisma.$queryRaw`SELECT 1 as connected`
    return NextResponse.json({ 
      status: 'success', 
      message: 'Conexión a la base de datos exitosa', 
      data: result 
    })
  } catch (error: any) {
    console.error('[API Test DB Error]:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Fallo al conectar a la base de datos', 
      details: error.message,
      env_present: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        DIRECT_URL: !!process.env.DIRECT_URL
      }
    }, { status: 500 })
  }
}
