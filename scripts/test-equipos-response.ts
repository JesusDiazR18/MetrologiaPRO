import { prisma } from '../src/lib/prisma'

async function main() {
  const equipos = await prisma.instrumentoEquipo.findMany({
    include: {
      historiales: true
    }
  })
  console.log('Equipos count:', equipos.length)
  console.log('Primer equipo Magnitud:', equipos[0]?.Magnitud)
  console.log('Primer equipo keys:', Object.keys(equipos[0] || {}))
}

main()
  .catch(e => console.error(e))
