// ReconPro v11.0.0 Seed
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.user.upsert({ where: { email: "admin@reconpro.local" }, update: {}, create: { email: "admin@reconpro.local", name: "Admin", role: "ADMIN" } });
  console.log("Seed complete.");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
