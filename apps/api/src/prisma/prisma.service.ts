import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }

  // onModuleInit runs when NestJS starts up. We connect to the database here.
  async onModuleInit() {
    await this.$connect();
  }

  // onModuleDestroy runs when NestJS shuts down. We disconnect cleanly.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
