import * as React from 'react';
import useWebSocket from 'react-use-websocket';
import { useDispatch, useSelector } from 'react-redux';
import { selectFigure } from '../../store/slices/game';
import { GameTypes } from '../..';
import { ServerMessageTypes } from '../../WsHandler';

export const Cell = (props: any) => {
  const accessToken = useSelector((state: any) => state.tokens.accessToken);
  const { sendJsonMessage } = useWebSocket('ws://localhost:3000', {
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
  
  const cellClick = () => {
    if (isCellHighlithed && !isCellSelected) {
      sendJsonMessage({ 
        type: ServerMessageTypes.Game,
        body: { 
          type: GameTypes.MAKE_TURN, 
          gameId,
          body: { figure: selectedFigure.figure, cell: props.name }
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
  return (
    <div className={className} onClick={cellClick}>
      {
        isCellHighlithed ? <span className='board__row__cell-dot'></span>:null
      }
    </div>
  );
};