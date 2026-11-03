import { IsNotEmpty } from 'class-validator';
import type { GoogleOauthRequest } from '@chess/contract';

export class GoogleCode implements GoogleOauthRequest {
  @IsNotEmpty()
  code: string;
}
