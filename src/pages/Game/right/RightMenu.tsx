import * as React from 'react';
import { useSelector } from 'react-redux';
import { GameTimer } from './Timer';

import './RightMenu.scss';

export function RigthMenu() {
  const { side } = useSelector((state: any) => state.game);
  const opponentOnPage =
    useSelector((state: any) => state.game.opponentOnPage) || true;
  const strikedFigures = useSelector(
    (state: any) => state.game.strikedFigures,
  );

  const strikedBlack = strikedFigures.black.map((figure: string) => (
    <div
      className={
        'game__right-menu__striked__figure' +
        ` ${figure.replace(/\d/, '')}` +
        ' b'
      }
      key={`${figure}-b`}
    />
  ));
  const strikedWhite = strikedFigures.white.map((figure: string) => (
    <div
      className={
        'game__right-menu__striked__figure' +
        ` ${figure.replace(/\d/, '')}` +
        ' w'
      }
      key={`${figure}-w`}
    />
  ));

  return (
    <div className="game__right-menu">
      <span
        className={`game__right-menu__opponent-status-${opponentOnPage}`}
      />
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
    </div>
  );
}
