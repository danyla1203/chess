import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserModel } from './model';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

@Module({
  controllers: [UserController],
  providers: [UserService, UserModel, PrismaService],
  exports: [UserService],
})
export class UserModule {}
