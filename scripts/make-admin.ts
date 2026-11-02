/*
  Promotes an existing account to admin (or support):
    npm run make-admin -- you@example.com
    npm run make-admin -- agent@example.com SUPPORT
  Register the account on the site first.
*/
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const [email, roleArg] = process.argv.slice(2);
const role = (roleArg || "ADMIN").toUpperCase();

async function main() {
  if (!email) throw new Error("Usage: npm run make-admin -- <email> [ADMIN|SUPPORT|USER]");
  if (!["ADMIN", "SUPPORT", "USER"].includes(role)) throw new Error("Role must be ADMIN, SUPPORT or USER");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }) });
  try {
    const user = await db.user.update({ where: { email: email.toLowerCase() }, data: { role: role as never } });
    // Drop sessions so the new role shows up on next sign-in.
    await db.session.deleteMany({ where: { userId: user.id } });
    console.log(`${user.email} is now ${role}. Sign in again to see the change.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exitCode = 1;
});
