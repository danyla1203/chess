import * as React from 'react';
import { selectFigure } from '../../store/game';
import { sendMessage } from '../../store/ws';
import { useAppSelector, useAppDispatch } from '../../store';

export function Cell({ name, color, isActive = true }: any) {
  const isGameEnded = useAppSelector((state) => state.game.isEnded);
  const dispatch = useAppDispatch();

  const { figure, side } = useAppSelector(
    ({
      game: {
        board: { white, black },
      },
    }) => {
      for (const f in white) {
        if (white[f] === name) return { side: 'w', figure: f };
      }
      for (const f in black) {
        if (black[f] === name) return { side: 'b', figure: f };
      }
      return {};
    },
  );

  const isCellShached = useAppSelector(({ game: { shahData } }) => {
    if (shahData.shachedSide === side && figure === 'Kn') return true;
    return false;
  });
  const gameId = useAppSelector((state) => state.game.id);
  const selectedFigure = useAppSelector((state) => state.game.selectedFigure);
  const isCellHighlithed = useAppSelector((state) =>
    state.game.highlightedCels.includes(name),
  );
  const isCellSelected = selectedFigure.cell === name;

  let cellClick = () => {
    if (!isActive) return;
    if (isCellHighlithed && !isCellSelected) {
      dispatch(
        sendMessage({
          event: 'move',
          body: {
            gameId,
            figure: selectedFigure.figure,
            cell: name,
          },
        }),
      );
    } else {
      dispatch(selectFigure({ figure, cell: name }));
    }
  };

  let className = `board__row__cell ${color}`;
  if (isCellSelected) className += ' selected';
  if (figure) className += ` ${figure.replace(/\d/, '')} ${side}`;
  if (isCellShached) className += ' shahed';
  if (isGameEnded) cellClick = () => {};
  return (
    <div className={className} onClick={cellClick}>
      {isCellHighlithed ? <span className="board__row__cell-dot" /> : null}
    </div>
  );
}
