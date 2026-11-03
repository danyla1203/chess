import { Module } from '@nestjs/common';
import { StripeModule } from '../infrastructure/stripe/stripe.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { UserModule } from '../user';
@Module({
  imports: [StripeModule, UserModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
