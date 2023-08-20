import * as React from 'react';
import { Button } from '@mui/material';
import { GameTimer } from './Timer';
import { useAppDispatch, useAppSelector } from '../../../store';
import './RightMenu.scss';
import { plusTime } from '../../../store/game';
import { GameButtons } from './GameButtons';

export function Striked({ figure }: { figure: string }) {
  return (
    <div
      className={
        'game__right-menu__striked__figure' +
        ` ${figure.replace(/\d/, '')}` +
        ' b'
      }
      key={`${figure}-b`}
    />
  );
}

export function RigthMenu() {
  const { side } = useAppSelector((state) => state.game);
  const opponentOnPage = useAppSelector((state) => state.game.opponentOnPage);
  const { black, white } = useAppSelector((state) => state.game.strikedFigures);

  const dispatch = useAppDispatch();

  const addTime = () => dispatch(plusTime());

  const strikedBlack = black.map((figure) => <Striked figure={figure} />);
  const strikedWhite = white.map((figure) => <Striked figure={figure} />);

  return (
    <div className="game__right-menu">
      <div className="game__right-menu__top">
        <span
          className={`game__right-menu__opponent-status-${opponentOnPage}`}
        />
        <Button variant="contained" onClick={addTime}>
          + Time
        </Button>
      </div>
      <div className="game__right-menu__striked">
        {side === 'w' ? strikedWhite : strikedBlack}
      </div>
      <div className="game__right-menu__timers">
        <GameTimer side={side === 'w' ? 'b' : 'w'} />
        <GameTimer side={side} />
      </div>
      <div className="game__right-menu__striked">
        {side === 'w' ? strikedBlack : strikedWhite}
      </div>
      <GameButtons />
    </div>
  );
}
