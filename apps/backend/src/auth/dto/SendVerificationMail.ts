import { IsEmail } from 'class-validator';
import type { SendVerificationMailRequest } from '@chess/contract';

export class SendVerificationMail implements SendVerificationMailRequest {
  @IsEmail()
  email: string;
}
