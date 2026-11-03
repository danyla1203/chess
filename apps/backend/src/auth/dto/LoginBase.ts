import { IsString, Length } from 'class-validator';

export class LoginBase {
  @IsString()
  @Length(6, 20)
  password: string;

  @IsString()
  @Length(5)
  deviceId: string;
}
