import { IsEnum, IsNumber } from 'class-validator';
import type { CreateGame } from '@chess/contract';

enum Side {
  White = 'w',
  Black = 'b',
  Random = 'rand',
}

export class CreateGameDto implements CreateGame {
  @IsEnum(Side)
  side: 'w' | 'b' | 'rand';

  @IsNumber()
  time: number;

  @IsNumber()
  timeIncrement: number;

  @IsNumber()
  bet: number;
}
