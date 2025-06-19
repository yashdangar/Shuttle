import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create a test hotel
  const hotel = await prisma.hotel.upsert({
    where: { name: "Test Airport Hotel" },
    update: {},
    create: {
      name: "Test Airport Hotel",
      address: "123 Airport Road, Test City",
      phoneNumber: "+1-555-0123",
      email: "info@testairporthotel.com",
      latitude: 40.7128,
      longitude: -74.0060,
    },
  });

  // Create a test driver
  const hashedPassword = await bcrypt.hash('driver123', 10);
  const driver = await prisma.driver.upsert({
    where: { email: "driver@test.com" },
    update: {},
    create: {
      name: "John Driver",
      email: "driver@test.com",
      password: hashedPassword,
      phoneNumber: "+1-555-0001",
      hotelId: hotel.id,
    },
  });

  // Create a test frontdesk user
  const frontdeskPassword = await bcrypt.hash('frontdesk123', 10);
  const frontdesk = await prisma.frontDesk.upsert({
    where: { email: "frontdesk@test.com" },
    update: {},
    create: {
      name: "Jane Frontdesk",
      email: "frontdesk@test.com",
      password: frontdeskPassword,
      phoneNumber: "+1-555-0002",
      hotelId: hotel.id,
    },
  });

  // Create a test admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.admin.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@test.com",
      password: adminPassword,
      hotelId: hotel.id,
    },
  });

  // Create locations
  const locations = [
    {
      name: "Hotel Lobby",
      latitude: 40.7128,
      longitude: -74.0060,
    },
    {
      name: "Airport Terminal 1",
      latitude: 40.6413,
      longitude: -73.7781,
    },
    {
      name: "Airport Terminal 2",
      latitude: 40.6413,
      longitude: -73.7781,
    },
    {
      name: "Airport Terminal 3",
      latitude: 40.6413,
      longitude: -73.7781,
    },
    {
      name: "Downtown Station",
      latitude: 40.7589,
      longitude: -73.9851,
    },
    {
      name: "Conference Center",
      latitude: 40.7505,
      longitude: -73.9934,
    },
  ];

  for (const location of locations) {
    await prisma.location.upsert({
      where: { name: location.name },
      update: {},
      create: location,
    });
  }

  // Create a test shuttle
  const shuttle = await prisma.shuttle.upsert({
    where: { vehicleNumber: "TEST-001" },
    update: {},
    create: {
      vehicleNumber: "TEST-001",
      seats: 12,
      hotelId: hotel.id,
    },
  });

  console.log('Seed completed successfully!');
  console.log('Test credentials:');
  console.log('Driver: driver@test.com / driver123');
  console.log('Frontdesk: frontdesk@test.com / frontdesk123');
  console.log('Admin: admin@test.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 