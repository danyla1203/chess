import * as React from 'react';
import { GameState } from './GameState';
import { PreviewController } from './PreviewController';
import { Board } from '../../Game/Board';

export function GameViewer() {
  return (
    <div className="game">
      <GameState />
      <Board isActive={false} />
      <PreviewController />
    </div>
  );
}
