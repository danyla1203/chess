import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectFigure } from '../../store/slices/game';
import { sendMessage } from '../../store/slices/ws';

export function Cell({ name, color }: any) {
  const isGameEnded = useSelector(
    (state: any) => state.game.isGameEnded,
  );
  const dispatch = useDispatch();

  const { figure, side } = useSelector(
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

  const isCellShached = useSelector(({ game: { shahData } }: any) => {
    if (shahData.shachedSide === side && figure === 'Kn') return true;
    return false;
  });
  const gameId = useSelector((state: any) => state.game.id);
  const selectedFigure = useSelector(
    (state: any) => state.game.selectedFigure,
  );
  const isCellHighlithed = useSelector((state: any) =>
    state.game.highlightedCels.includes(name),
  );
  const isCellSelected = selectedFigure.cell === name;

  let cellClick = () => {
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
      {isCellHighlithed ? (
        <span className="board__row__cell-dot" />
      ) : null}
    </div>
  );
}
