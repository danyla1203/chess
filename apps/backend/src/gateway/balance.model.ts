import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

@Injectable()
export class BalanceModel {
  constructor(private readonly prisma: PrismaService) {}

  public async getUserBalance(id: number): Promise<number> {
    return (
      await this.prisma.user.findFirst({
        where: { id },
      })
    ).balance;
  }
}
