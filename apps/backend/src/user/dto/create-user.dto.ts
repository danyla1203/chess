import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { SignUpRequest } from '@chess/contract';

export class CreateUserDto implements SignUpRequest {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  password: string;

  @IsString()
  @MinLength(4)
  @MaxLength(20)
  name: string;

  @IsString()
  deviceId: string;
}
