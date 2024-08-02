import { Module } from '@nestjs/common';
import { StripeModule } from './stripe/stripe.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { UserService } from '../user/user.service';
import { UserModel } from '../user/model';
import { PrismaService } from '../prisma.service';
@Module({
  imports: [StripeModule],
  providers: [PaymentsService, UserService, UserModel, PrismaService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
