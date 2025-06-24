import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Handle beforeExit to properly close the connection
process.on('beforeExit', async () => {
  console.log('Closing Prisma connection...');
  await prisma.$disconnect();
});

// Handle SIGINT and SIGTERM to properly close the connection
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing Prisma connection...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing Prisma connection...');
  await prisma.$disconnect();
  process.exit(0);
});

// Test database connection on startup
prisma.$connect()
  .then(() => {
    console.log('✅ Database connection established successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to connect to database:', error);
  });

export default prisma;