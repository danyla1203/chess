import { IsString, Length, Matches } from 'class-validator';
import type { NameLoginRequest } from '@chess/contract';
import { LoginBase } from './LoginBase';

export class NameLoginDto extends LoginBase implements NameLoginRequest {
  @IsString()
  @Length(4, 15)
  @Matches(/\w+/)
  name: string;
}
