import { IsEmail } from 'class-validator';
import type { EmailLoginRequest } from '@chess/contract';
import { LoginBase } from './LoginBase';

export class EmailLoginDto extends LoginBase implements EmailLoginRequest {
  @IsEmail()
  email: string;
}
