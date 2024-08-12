import { Injectable } from '@nestjs/common';
import { Confirmation, Payment } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto';
import { prismaSelectUserProfile, UserGames, UserProfile } from './entities';

@Injectable()
export class UserModel {
  constructor(private readonly prisma: PrismaService) {}

  public createUser(
    confirmationId: number,
    user: CreateUserDto,
  ): Promise<UserProfile> {
    return this.prisma.user.create({
      select: prismaSelectUserProfile,
      data: {
        name: user.name,
        email: user.email,
        password: user.password,
        confirmationId,
      },
    });
  }

  public findConfirmation(email: string): Promise<Confirmation> {
    return this.prisma.confirmation.findUnique({ where: { email } });
  }

  public findProfile(id: number): Promise<UserProfile> {
    return this.prisma.user.findUnique({
      select: prismaSelectUserProfile,
      where: { id },
    });
  }
  public findProfileByEmail(email: string): Promise<UserProfile> {
    return this.prisma.user.findUnique({
      select: prismaSelectUserProfile,
      where: { email },
    });
  }

  public updateUser(id: number, name: string): Promise<UserProfile> {
    return this.prisma.user.update({
      select: prismaSelectUserProfile,
      where: { id },
      data: { name },
    });
  }
  public updateUserBalance(id: number, increment: number) {
    const updateUser = this.prisma.user.update({
      select: prismaSelectUserProfile,
      where: { id },
      data: {
        balance: {
          increment,
        },
      },
    });
    const addInvoice = this.prisma.payment.create({
      data: {
        topUpAmount: increment,
        userId: id,
      },
    });
    return this.prisma.$transaction([updateUser, addInvoice]);
  }

  public findUserGames(id: number): Promise<UserGames[]> {
    return this.prisma.game.findMany({
      select: {
        id: true,
        maxTime: true,
        timeIncrement: true,
        sideSelecting: true,
        moves: true,
        isDraw: true,
        players: {
          select: {
            userId: true,
            side: true,
            isWinner: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
      where: { players: { some: { userId: id } } },
      orderBy: { id: 'asc' },
    });
  }

  public getUserInvoices(userId: number): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      orderBy: {
        date: 'desc',
      },
      where: { userId },
    });
  }
}
