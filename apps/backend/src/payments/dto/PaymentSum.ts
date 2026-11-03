import { IsNumber } from 'class-validator';
import type { PaymentSumRequest } from '@chess/contract';

export class PaymentSum implements PaymentSumRequest {
  @IsNumber()
  amount: number;
}
