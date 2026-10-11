// Demo data so the screens have something to show.
// Run with: npm run seed   (safe to run twice, it only adds what is missing)
import { PaymentStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Obviously fake numbers.
const ADMIN_PHONE = '+919999900000';
const PEOPLE = [
  { phoneNumber: '+919845000011', name: 'Asha Kumar' },
  { phoneNumber: '+919845000012', name: 'Ravi Shankar' },
  { phoneNumber: '+919845000013', name: 'Meena Iyer' },
  { phoneNumber: '+919845000014', name: 'Karthik R' },
  { phoneNumber: '+919845000015', name: 'Divya S' },
];

// [person index, amount in paise, status, hours ago]
const PAYMENTS: Array<[number, number, PaymentStatus, number]> = [
  [0, 49900, 'succeeded', 120],
  [0, 129900, 'succeeded', 90],
  [1, 79900, 'succeeded', 70],
  [1, 25000, 'pending', 30],
  [2, 199900, 'succeeded', 60],
  [2, 49900, 'failed', 50],
  [3, 99900, 'succeeded', 40],
  [3, 15000, 'refunded', 25],
  [4, 59900, 'pending', 10],
  [0, 34900, 'pending', 3],
];

async function main() {
  await prisma.user.upsert({
    where: { phoneNumber: ADMIN_PHONE },
    create: { phoneNumber: ADMIN_PHONE, name: 'Demo Admin', role: 'admin' },
    update: { role: 'admin' },
  });

  const users = [];
  for (const person of PEOPLE) {
    users.push(
      await prisma.user.upsert({ where: { phoneNumber: person.phoneNumber }, create: person, update: {} }),
    );
  }

  if ((await prisma.payment.count()) === 0) {
    for (const [index, amount, status, hoursAgo] of PAYMENTS) {
      const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      await prisma.payment.create({
        data: { userId: users[index].id, amount, currency: 'INR', status, createdAt },
      });
    }
  }

  console.log(`Demo admin: ${ADMIN_PHONE}. Users: ${users.length}. Payments: ${PAYMENTS.length}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
