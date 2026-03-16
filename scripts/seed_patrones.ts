import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando patrones de referencia...');

  const patrones = [
    {
      ID_Patron: 'P001',
      Codigo: 'PAT-001',
      Nombre_Patron: 'Bloques Patrón Grado 0',
      N_Certificado: 'CERT-2024-001',
      Fecha_Vencimiento_Certificado: new Date('2025-12-31'),
      Estado_Vigencia: 'VIGENTE',
      Proveedor_Laboratorio: 'Laboratorio de Metrología Central'
    },
    {
      ID_Patron: 'P002',
      Codigo: 'PAT-002',
      Nombre_Patron: 'Micrómetro de Exteriores (0-25mm)',
      N_Certificado: 'CERT-2024-002',
      Fecha_Vencimiento_Certificado: new Date('2025-06-30'),
      Estado_Vigencia: 'VIGENTE',
      Proveedor_Laboratorio: 'Gabinete de Calibración Especializada'
    },
    {
      ID_Patron: 'P003',
      Codigo: 'PAT-003',
      Nombre_Patron: 'Pesas Patrón Clase M1',
      N_Certificado: 'CERT-2023-089',
      Fecha_Vencimiento_Certificado: new Date('2025-10-15'),
      Estado_Vigencia: 'VIGENTE',
      Proveedor_Laboratorio: 'Área de Pesaje Certificada'
    },
    {
      ID_Patron: 'P004',
      Codigo: 'PAT-004',
      Nombre_Patron: 'Termómetro de Referencia Digital',
      N_Certificado: 'CERT-2024-045',
      Fecha_Vencimiento_Certificado: new Date('2025-08-20'),
      Estado_Vigencia: 'VIGENTE',
      Proveedor_Laboratorio: 'Laboratorio Térmico Nacional'
    }
  ];

  for (const p of patrones) {
    await prisma.patronReferencia.upsert({
      where: { ID_Patron: p.ID_Patron },
      update: p,
      create: p,
    });
  }

  console.log('Patrones sembrados con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
