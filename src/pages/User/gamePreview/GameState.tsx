import * as React from 'react';
import { Button } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../store';
import { Striked } from '../../Game/right/RightMenu';
import './GameState.scss';
import { Move } from '../../../store/game/game.types';
import { closeGameAction } from '../../../store/user';

function Figure({ figure, color }: { figure: string; color: 'w' | 'b' }) {
  return (
    <div
      className={
        'game-state__moves__item__figure' +
        ` ${figure.replace(/\d/, '')}` +
        ` ${color}`
      }
      key={`${figure}-b`}
    />
  );
}

function MoveItem({ move, selected }: { move: Move; selected: boolean }) {
  return (
    <div className={`game-state__moves__item ${selected ? 'current' : ''}`}>
      <Figure color={move.side} figure={move.figure} key={move.figure} />
      <h3>{move.to}</h3>
      {move.strike && (
        <>
          <h3 className="arrow">–</h3>
          <Figure
            color={move.strike.strikedSide}
            figure={move.strike.figure}
            key={move.strike.figure}
          />
        </>
      )}
    </div>
  );
}

export function GameState() {
  const { black, white } = useAppSelector((state) => state.game.strikedFigures);
  const moves = useAppSelector((state) => state.game.movesHistory);
  const currentFrame = useAppSelector(
    (state) => state.game.movesHistory[state.game.frameIndex],
  );
  const dispatch = useAppDispatch();

  const backToProfile = () => {
    dispatch(closeGameAction());
  };

  const strikedBlack = black.map((figure) => (
    <Striked figure={figure} key={figure} />
  ));
  const strikedWhite = white.map((figure) => (
    <Striked figure={figure} key={figure} />
  ));
  const renderedMoves = moves.map((move) => {
    if (currentFrame) {
      const { figure, side, from } = currentFrame;
      if (figure === move.figure && side === move.side && from === move.from) {
        return (
          <MoveItem
            move={move}
            selected
            key={move.figure + move.to + move.from}
          />
        );
      }
    }
    return (
      <MoveItem
        move={move}
        selected={false}
        key={move.figure + move.to + move.from}
      />
    );
  });
  return (
    <div className="game-state">
      <Button onClick={backToProfile}>Back</Button>
      <div className="game-state__striked">
        <div className="state__striked__black">{strikedBlack}</div>
        <div className="state__striked__white">{strikedWhite}</div>
      </div>
      <div className="game-state__moves">{renderedMoves}</div>
    </div>
  );
}
