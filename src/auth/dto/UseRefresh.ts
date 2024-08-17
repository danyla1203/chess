import { IsNotEmpty, IsString } from 'class-validator';

export class UseRefreshDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
