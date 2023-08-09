import * as React from 'react';
import { useSelector } from 'react-redux';

import { Cell } from './Сell';

export function Board() {
  const { side } = useSelector((state: any) => state.game);

  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const result = [];
  for (let i = 0; i < 8; i++) {
    const row = [];
    for (let j = 0; j < 8; j++) {
      const color = (i + j) % 2 === 0 ? 'cell-color2' : 'cell-color1';
      const name = letters[j] + (i + 1);
      row.push(
        <Cell color={color} key={letters[j] + (i + 1)} name={name} />,
      );
    }
    result.push(row);
  }
  console.log('board render');
  let renderedResult = result.map((row, i) => (
    <div key={`board row ${letters[i]}`} className="board__row">
      {row.map((cell) => cell)}
    </div>
  ));
  if (side === 'w') renderedResult = renderedResult.reverse();

  return <div className="board">{renderedResult}</div>;
}
