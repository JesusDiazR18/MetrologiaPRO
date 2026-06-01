import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Clearing Verification History Only ---');
  
  // Get initial count
  const countBefore = await prisma.historialVerificacion.count();
  console.log(`Records in HistorialVerificacion before clearing: ${countBefore}`);

  // Delete history records
  const deleteResult = await prisma.historialVerificacion.deleteMany();
  console.log(`Success! Deleted ${deleteResult.count} records from HistorialVerificacion.`);
  
  console.log('--- Clearing Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Error clearing verification history:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
