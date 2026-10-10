import { PaymentStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Obviously fake numbers, safe to demo with.
const DEMO_ADMIN = '+919999900000';
const DEMO_USERS = [
  '+919845000011',
  '+919845000012',
  '+919845000013',
  '+919845000014',
  '+919845000015',
  '+919845000016',
];

const SAMPLE_PAYMENTS: Array<[number, number, PaymentStatus]> = [
  // [user index, amount in paise, status]
  [0, 49900, 'succeeded'],
  [0, 129900, 'succeeded'],
  [1, 79900, 'succeeded'],
  [1, 25000, 'pending'],
  [2, 199900, 'succeeded'],
  [2, 49900, 'failed'],
  [3, 99900, 'succeeded'],
  [3, 15000, 'refunded'],
  [4, 59900, 'pending'],
  [5, 34900, 'succeeded'],
  [5, 89900, 'succeeded'],
];

async function main() {
  await prisma.user.upsert({
    where: { phoneNumber: DEMO_ADMIN },
    create: { phoneNumber: DEMO_ADMIN, role: 'admin' },
    update: { role: 'admin' },
  });

  const users = [];
  for (const phoneNumber of DEMO_USERS) {
    users.push(
      await prisma.user.upsert({ where: { phoneNumber }, create: { phoneNumber }, update: {} }),
    );
  }

  await prisma.user.update({ where: { id: users[4].id }, data: { status: 'suspended' } });

  if ((await prisma.payment.count()) === 0) {
    const now = Date.now();
    for (const [i, [userIndex, amount, status]] of SAMPLE_PAYMENTS.entries()) {
      await prisma.payment.create({
        data: {
          userId: users[userIndex].id,
          amount,
          currency: 'INR',
          status,
          // spread over the last couple of weeks
          createdAt: new Date(now - (SAMPLE_PAYMENTS.length - i) * 30 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log(`Seeded admin ${DEMO_ADMIN}, ${users.length} users, ${SAMPLE_PAYMENTS.length} payments`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
