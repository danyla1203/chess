import { IsString, MaxLength, MinLength } from 'class-validator';
import type { SendChatMessage } from '@chess/contract';

export class ChatMessage implements SendChatMessage {
  @MinLength(1)
  @MaxLength(50)
  @IsString()
  text: string;

  gameId: number;
}
