import { IsEmail, IsString, Length, Matches } from 'class-validator';

class LoginBase {
  @IsString()
  @Length(6, 20)
  password: string;

  @IsString()
  @Length(5)
  deviceId: string;
}

export class EmailLoginDto extends LoginBase {
  @IsEmail()
  email: string;
}

export class NameLoginDto extends LoginBase {
  @IsString()
  @Length(4, 15)
  @Matches(/\w+/)
  name: string;
}
