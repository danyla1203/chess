import { IsNotEmpty, IsString } from 'class-validator';
import type { UseRefreshRequest } from '@chess/contract';

export class UseRefreshDto implements UseRefreshRequest {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
