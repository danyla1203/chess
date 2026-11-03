import { IsEmail, IsString, Length, Matches } from 'class-validator';
import type { EmailLoginRequest, NameLoginRequest } from '@chess/contract';

class LoginBase {
  @IsString()
  @Length(6, 20)
  password: string;

  @IsString()
  @Length(5)
  deviceId: string;
}

export class EmailLoginDto extends LoginBase implements EmailLoginRequest {
  @IsEmail()
  email: string;
}

export class NameLoginDto extends LoginBase implements NameLoginRequest {
  @IsString()
  @Length(4, 15)
  @Matches(/\w+/)
  name: string;
}
