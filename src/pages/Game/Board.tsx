import * as React from 'react';
import { useSelector } from 'react-redux';
import './Board.scss';
import { Cell } from './Сell';
import { GameTimer } from './Timer';


export const Board = () => {
  const { side, timeIncrement, time } = useSelector((state: any) => state.game);
  const strikedFigures = useSelector((state: any) => state.game.strikedFigures);

  const letters = [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h' ];
  const result = [];
  for (let i = 0; i < 8; i++) {
    const row = [];
    for (let j = 0; j < 8; j++) {
      row.push(<Cell key={letters[j] + (i + 1)} name={letters[j] + (i + 1)}/>);
    }
    result.push(row);
  }

  let renderedResult = result.map((row, i) => (
    <div key={i} className={'board__wrapper__main__row'}>
      {row.map((Cell) => Cell)}
    </div>
  ));
  if (side === 'w') renderedResult = renderedResult.reverse();

  const strikedBlack = strikedFigures.black.map((figure: string) =>
    <div className={'board__wrapper__striked__figure' + ` ${figure.replace(/\d/, '')}` + ' b'}></div>
  );
  const strikedWhite = strikedFigures.white.map((figure: string) =>
    <div className={'board__wrapper__striked__figure' + ` ${figure.replace(/\d/, '')}` + ' w'}></div>
  );

  return (
    <div className='board'>
      <div className={'board__wrapper'}>
        <div className='board__wrapper__main'>
          {renderedResult}
        </div>
      </div>
      <div className="board__rigth-menu">
        <div className="board__timers">
          <div className={'board__wrapper__striked'}>
            {side === 'w' ? strikedWhite : strikedBlack}
          </div>
          <GameTimer side={side === 'w' ? 'b' : 'w'} time={time} increment={timeIncrement} />
          <GameTimer side={side} time={time} increment={timeIncrement} />
          <div className={'board__wrapper__striked'}>
            {side === 'w' ? strikedBlack : strikedWhite}
          </div>
        </div>
      </div>
    </div>
  );
};