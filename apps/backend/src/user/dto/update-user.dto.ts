import { IsString, Length, Matches } from 'class-validator';
import type { UpdateUserRequest } from '@chess/contract';

export class UpdateUserDto implements UpdateUserRequest {
  @IsString()
  @Length(4, 15)
  @Matches(/\w+/)
  name: string;
}
