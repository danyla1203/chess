import { IsString, Length, Matches } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @Length(4, 15)
  @Matches(/\w+/)
  name: string;
}
