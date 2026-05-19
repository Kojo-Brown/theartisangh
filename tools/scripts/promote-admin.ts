/*
 * Usage:
 *   pnpm tsx tools/scripts/promote-admin.ts +233241234567 "Nicholas Brown"
 *
 * Creates the user if they don't exist yet, then sets role=ADMIN. This is the
 * only way to bootstrap an admin — there is no public registration path for
 * the ADMIN role. Run on a trusted host with DATABASE_URL set.
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const [, , phone, fullName = 'Admin'] = process.argv;
  if (!phone || !/^\+233[2-9]\d{8}$/.test(phone)) {
    console.error('Usage: promote-admin.ts <+233...> [fullName]');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.upsert({
      where: { phone },
      update: { role: 'ADMIN' },
      create: { phone, fullName, role: 'ADMIN' },
    });
    console.log(`✓ ${user.phone} is now ADMIN (id=${user.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
