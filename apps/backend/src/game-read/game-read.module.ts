import { Module } from '@nestjs/common';
import { GameReadModel } from './game-read.model';

@Module({
  providers: [GameReadModel],
  exports: [GameReadModel],
})
export class GameReadModule {}
