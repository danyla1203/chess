import * as React from 'react';
import useWebSocket from 'react-use-websocket';
import { useDispatch, useSelector } from 'react-redux';
import { selectFigure } from '../../store/slices/game';
import { GameTypes, ServerMessageTypes } from '../..';

export const Cell = (props: any) => {
  const { sendJsonMessage } = useWebSocket('ws://localhost:3000', { share: true });
  const dispatch = useDispatch();
  
  const { figure, side } = useSelector(({ game: { board: { white, black } } }) => {
    if (white[props.name]) return { side: 'w', figure: white[props.name] };
    if (black[props.name]) return { side: 'b', figure: black[props.name] };
    return {};
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

  let className = 'cell';
  if (isCellSelected) className += ' selected';
  if (isCellHighlithed) className += ' highlighted';
  if (figure) className += ` ${figure.replace(/\d/, '')} ${side}`;
  return (
    <div 
      className={className}
      onClick={cellClick}
    ></div>
  );
};