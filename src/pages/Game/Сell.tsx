import * as React from 'react';
import useWebSocket from 'react-use-websocket';
import { useDispatch, useSelector } from 'react-redux';
import { selectFigure } from '../../store/slices/game';
import { config } from '../../config';

export const Cell = (props: any) => {
  const accessToken = useSelector((state: any) => state.user.accessToken);
  const isGameEnded = useSelector((state: any) => state.game.isGameEnded);
  const { sendJsonMessage } = useWebSocket(`ws://${config.apiDomain}`, {
    share: true,
    queryParams: {
      'Authorization': accessToken,
    },
  });
  const dispatch = useDispatch();
  
  const { figure, side } = useSelector(({ game: { board: { white, black } } }) => {
    if (white[props.name]) return { side: 'w', figure: white[props.name] };
    if (black[props.name]) return { side: 'b', figure: black[props.name] };
    return {};
  });
  const isCellShached = useSelector(({ game: { shahData } }) => {
    if (shahData.shachedSide === side && figure === 'Kn') return true;
  });
  const gameId = useSelector((state: any) => state.game.id);
  const selectedFigure = useSelector((state: any) => state.game.selectedFigure);
  const isCellHighlithed = useSelector((state: any) => state.game.highlightedCels.includes(props.name));
  const isCellSelected = selectedFigure.cell === props.name;
  
  let cellClick = () => {
    if (isCellHighlithed && !isCellSelected) {
      sendJsonMessage({ 
        action: '/game/make-turn',
        body: { 
          gameId,
          body: {
            figure: selectedFigure.figure,
            cell: props.name
          }
        } 
      });
    } else {
      dispatch(selectFigure(props.name));
    }
  };

  let className = `board__row__cell ${props.color}`;
  if (isCellSelected) className += ' selected';
  if (figure) className += ` ${figure.replace(/\d/, '')} ${side}`;
  if (isCellShached) className += ' shahed';
  if (isGameEnded) cellClick = () => {};
  return (
    <div className={className} onClick={cellClick}>
      {
        isCellHighlithed ? <span className='board__row__cell-dot'></span>:null
      }
    </div>
  );
};