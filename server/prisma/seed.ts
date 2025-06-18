import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create locations  const locations = [
    {
      name: "Hotel Lobby",
      latitude: 0,
      longitude: 0,
    },
    {
      name: "Airport Terminal 1",
      latitude: 0,
      longitude: 0,
    },
    {
      name: "Airport Terminal 2",
      latitude: 0,
      longitude: 0,
    },
    {
      name: "Airport Terminal 3",
      latitude: 0,
      longitude: 0,
    },
    {
      name: "Downtown Station",
      latitude: 0,
      longitude: 0,
    },
    {
      name: "Conference Center",
      latitude: 0,
      longitude: 0,
    },
  ];

  for (const location of locations) {
    await prisma.location.upsert({
      where: { name: location.name },
      update: {},
      create: location,
    });
  }

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 