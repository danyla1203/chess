import * as React from 'react';
import { useSelector } from 'react-redux';
import { GameTimer } from './Timer';

export const RigthMenu = () => {
  const { side } = useSelector((state: any) => state.game);
  const strikedFigures = useSelector((state: any) => state.game.strikedFigures);

  const strikedBlack = strikedFigures.black.map((figure: string) =>
    <div className={'game__rigth-menu__striked__figure' + ` ${figure.replace(/\d/, '')}` + ' b'}></div>
  );
  const strikedWhite = strikedFigures.white.map((figure: string) =>
    <div className={'game__rigth-menu__striked__figure' + ` ${figure.replace(/\d/, '')}` + ' w'}></div>
  );
  return (
    <div className="game__rigth-menu">
      <div className={'game__rigth-menu__striked'}>
        {side === 'w' ? strikedWhite : strikedBlack}
      </div>
      <div className="game__rigth-menu__timers">
        <GameTimer side={side === 'w' ? 'b' : 'w'} />
        <GameTimer side={side} />
      </div>
      <div className={'game__rigth-menu__striked'}>
        {side === 'w' ? strikedBlack : strikedWhite}
      </div>
    </div>
  );
};