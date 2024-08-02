import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto';
import { Confirmation } from '@prisma/client';
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
    return this.prisma.user.update({
      select: prismaSelectUserProfile,
      where: { id },
      data: {
        balance: {
          increment,
        },
      },
    });
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
}
