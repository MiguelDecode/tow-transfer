import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type RoleName = "ADMIN" | "MANAGER" | "DRIVER" | "REQUESTER";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The seed script must not run in production");
  }

  const passwordHash = await bcrypt.hash("Dev1234!", 10);

  const upsertCenter = (name: string) =>
    prisma.center.upsert({ where: { name }, update: {}, create: { name } });

  const north = await upsertCenter("Centro Norte");
  const south = await upsertCenter("Centro Sur");
  const east = await upsertCenter("Centro Este");

  const upsertUser = (
    name: string,
    email: string,
    role: RoleName,
    centerId: number | null = null,
  ) =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, passwordHash, role, centerId },
    });

  await upsertUser("Admin", "admin@example.com", "ADMIN");
  await upsertUser("Marta Gestora", "manager@example.com", "MANAGER");
  const driver = await upsertUser(
    "Luis Gruista",
    "driver1@example.com",
    "DRIVER",
  );
  await upsertUser("Pedro Gruista", "driver2@example.com", "DRIVER");
  const requester = await upsertUser(
    "Ana Solicitante",
    "requester@example.com",
    "REQUESTER",
    north.id,
  );

  if ((await prisma.transfer.count()) === 0) {
    const day = 24 * 60 * 60 * 1000;

    await prisma.transfer.create({
      data: {
        plate: "1234ABC",
        brand: "Marca A",
        model: "Modelo X",
        originCenterId: north.id,
        destinationCenterId: south.id,
        requestedAt: new Date(Date.now() + day),
        urgency: "HIGH",
        requesterId: requester.id,
        history: { create: { status: "PENDING", changedById: requester.id } },
      },
    });

    await prisma.transfer.create({
      data: {
        vin: "VIN00000000000001",
        brand: "Marca B",
        model: "Modelo Y",
        originCenterId: south.id,
        destinationCenterId: east.id,
        requestedAt: new Date(Date.now() + 2 * day),
        scheduledAt: new Date(Date.now() + 2 * day),
        status: "ASSIGNED",
        requesterId: requester.id,
        driverId: driver.id,
        history: {
          create: [
            { status: "PENDING", changedById: requester.id },
            { status: "ASSIGNED", changedById: driver.id },
          ],
        },
      },
    });
  }

  console.log("Seed completed");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
