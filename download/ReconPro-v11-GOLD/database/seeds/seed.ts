// ReconPro v11.0.0 — Database Seed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@reconpro.local" },
    update: {},
    create: {
      email: "admin@reconpro.local",
      name: "Admin",
      role: "ADMIN",
    },
  });
  console.log(`Created admin: ${admin.email}`);

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
