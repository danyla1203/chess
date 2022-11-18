import * as React from 'react';
import { useSelector } from 'react-redux';
import './Board.scss';
import { Cell } from './Сell';


export const Board = () => {
  const side = useSelector((state: any) => state.game.side);
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
  
  return (
    <div className={'board' + (side === 'w' ? ' rotated': '')}>
      <div className={'striked_block' + (side === 'w'? ' rotated': '') }>
        {
          strikedFigures.black.map((figure: string) => 
            <div className={'striked_figure' + ` ${figure.replace(/\d/, '')}` +' b'}></div>
          )
        }
      </div>
      <div className='board_main'>
        {result.map((row, i) => (
          <div key={i} className={'row' + (side === 'w' ? ' rotated' : '')}>
            {row.map((Cell) => Cell)}
          </div>
        ))}
      </div>
      <div className={'striked_block' + (side === 'w' ? ' rotated' : '')}>
        {
          strikedFigures.white.map((figure: string) =>
            <div className={'striked_figure' + ` ${figure.replace(/\d/, '')}` + ' w'}></div>
          )
        }
      </div>
    </div>
  );
};