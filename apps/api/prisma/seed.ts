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

  await seedProvidersAndJobs(users);

  console.log(`Demo admin: ${ADMIN_PHONE}. Users: ${users.length}. Payments: ${PAYMENTS.length}.`);
  console.log('Demo providers: +919846000001 (Asha, online), +919846000002 (Bala, online), +919846000003 (Kiran, pending).');
}

// ---- providers and finished jobs, so the console and the apps have content

const COMMISSION_PERCENT = 15;

const PROVIDERS = [
  {
    phoneNumber: '+919846000001',
    name: 'Asha Kumar',
    businessName: 'Asha Auto Care',
    verification: 'approved' as const,
    online: true,
    areaName: 'Indiranagar',
    latitude: 12.9784,
    longitude: 77.6408,
    documents: 2,
  },
  {
    phoneNumber: '+919846000002',
    name: 'Bala S',
    businessName: 'Bala Tow Service',
    verification: 'approved' as const,
    online: true,
    areaName: 'Whitefield',
    latitude: 12.9698,
    longitude: 77.75,
    documents: 3,
  },
  {
    phoneNumber: '+919846000003',
    name: 'Kiran M',
    businessName: 'Kiran Mobile Mechanics',
    verification: 'pending' as const,
    online: false,
    areaName: null,
    latitude: null,
    longitude: null,
    documents: 2,
  },
];

const DOCUMENT_TYPES = ['driving_license', 'vehicle_registration', 'id_proof'] as const;

// [customer index, provider index, issue, area, base fare, km, payment status, hours ago]
const JOBS: Array<[number, number, 'flat_tyre' | 'battery' | 'towing', string, number, number, 'succeeded' | 'pending', number]> = [
  [0, 0, 'flat_tyre', 'MG Road', 25000, 3.7, 'succeeded', 70],
  [1, 0, 'battery', 'Koramangala', 30000, 7.2, 'succeeded', 40],
  [2, 1, 'towing', 'Electronic City', 80000, 21.4, 'succeeded', 26],
  [3, 0, 'flat_tyre', 'Hebbal', 25000, 9.1, 'pending', 4],
];

async function seedProvidersAndJobs(customers: { id: string }[]) {
  if ((await prisma.serviceRequest.count()) > 0) return;

  const profiles = [];
  for (const p of PROVIDERS) {
    const user = await prisma.user.upsert({
      where: { phoneNumber: p.phoneNumber },
      create: { phoneNumber: p.phoneNumber, name: p.name, role: 'provider' },
      update: { role: 'provider' },
    });
    const profile = await prisma.providerProfile.create({
      data: {
        userId: user.id,
        businessName: p.businessName,
        verification: p.verification,
        online: p.online,
        areaName: p.areaName,
        latitude: p.latitude,
        longitude: p.longitude,
        reviewedAt: p.verification === 'approved' ? new Date() : null,
        documents: {
          create: DOCUMENT_TYPES.slice(0, p.documents).map((type) => ({
            type,
            fileUrl: `https://example.com/documents/${p.phoneNumber.slice(-2)}-${type}.jpg`,
          })),
        },
      },
    });
    profiles.push(profile);
  }

  const areaCoordinates: Record<string, [number, number]> = {
    'MG Road': [12.9756, 77.607],
    Koramangala: [12.9352, 77.6245],
    'Electronic City': [12.8452, 77.6602],
    Hebbal: [13.0358, 77.597],
  };

  for (const [customer, provider, issue, area, baseFare, km, paymentStatus, hoursAgo] of JOBS) {
    const total = baseFare + Math.round(km * 1000);
    const commission = Math.round((total * COMMISSION_PERCENT) / 100);
    const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const [latitude, longitude] = areaCoordinates[area];

    const request = await prisma.serviceRequest.create({
      data: {
        customerId: customers[customer].id,
        providerId: profiles[provider].id,
        issueType: issue,
        areaName: area,
        latitude,
        longitude,
        status: 'completed',
        baseFare,
        distanceKm: km,
        fareTotal: total,
        createdAt,
        acceptedAt: createdAt,
        completedAt: new Date(createdAt.getTime() + 45 * 60 * 1000),
      },
    });
    await prisma.requestOffer.create({
      data: { requestId: request.id, providerId: profiles[provider].id, status: 'accepted', respondedAt: createdAt },
    });
    await prisma.payment.create({
      data: {
        userId: customers[customer].id,
        requestId: request.id,
        amount: total,
        commissionAmount: commission,
        providerAmount: total - commission,
        currency: 'INR',
        status: paymentStatus,
        createdAt,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
