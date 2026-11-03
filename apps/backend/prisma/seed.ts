import { parseArgs } from 'node:util';
import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const options: { env: { type: 'string' | 'boolean' } } = {
  env: { type: 'string' },
};

async function generateData() {
  for (let i = 1; i < 11; i++) {
    //Create user and confirmation
    const email = faker.internet.email();
    const user = await prisma.user.create({
      data: {
        email,
        name: faker.internet.username(),
        password: faker.internet.password(),
        confirmation: {
          create: {
            email,
            code: faker.string.nanoid(8),
            isConfirmed: true,
          },
        },
      },
    });
    //Create payments for user
    const paymentsLoopCount = Math.floor(Math.random() * 10);
    let sum = 0;
    for (let i = 0; i < paymentsLoopCount; i++) {
      const payment = await prisma.payment.create({
        data: {
          userId: user.id,
          topUpAmount: Math.floor(Math.random() * 100),
        },
      });
      sum += payment.topUpAmount;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: sum,
      },
    });

    //For some user records create sessions and games
    if (i % 2 === 0) {
      await prisma.auth.createMany({
        data: [
          {
            refreshToken: faker.string.uuid(),
            deviceId: faker.string.nanoid(8),
            userId: user.id,
          },
          {
            refreshToken: faker.string.uuid(),
            deviceId: faker.string.nanoid(8),
            userId: user.id,
            expiresIn: new Date(),
          },
        ],
      });
      await prisma.game.create({
        data: {
          maxTime: faker.number.int({ min: 3600, max: 360000 }),
          timeIncrement: faker.number.int({ min: 3600, max: 360000 }),
          sideSelecting: faker.string.fromCharacters('wb'),
          isDraw: false,
          moves: '',
          players: {
            create: [
              {
                side: 'w',
                isWinner: true,
                userId: user.id,
              },
              {
                side: 'b',
                isWinner: false,
                userId: user.id - 1,
              },
            ],
          },
        },
      });
      //Create some confirmed and unconfirmed confirmations
      await prisma.confirmation.create({
        data: {
          email: faker.internet.email(),
          code: faker.string.nanoid(8),
          isConfirmed: true,
        },
      });
      await prisma.confirmation.create({
        data: {
          email: faker.internet.email(),
          code: faker.string.nanoid(8),
          isConfirmed: false,
        },
      });
    }
  }
  console.log('end');
}

async function main() {
  const {
    values: { env },
  } = parseArgs({ options });
  console.log(`Seeding... with env ${env}`);
  switch (env) {
    case 'test':
      await generateData();
      break;
    default:
      break;
  }
}
void main();
