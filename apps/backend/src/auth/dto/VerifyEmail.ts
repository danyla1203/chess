import { IsEmail, IsNotEmpty } from 'class-validator';
import type { VerifyEmailRequest } from '@chess/contract';

export class VerifyEmail implements VerifyEmailRequest {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  code: string;
}
