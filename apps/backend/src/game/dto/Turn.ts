import { IsNumber, IsString, Length } from 'class-validator';
import type { Turn } from '@chess/contract';

export class TurnBody implements Turn {
  @IsNumber()
  gameId: number;

  @IsString()
  @Length(1, 5)
  figure: string;

  @IsString()
  @Length(2, 2)
  cell: string;
}
