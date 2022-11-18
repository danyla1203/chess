import * as React from 'react';
import useWebSocket from 'react-use-websocket';
import { useDispatch, useSelector } from 'react-redux';
import { selectFigure } from '../../store/slices/game';
import { GameTypes, ServerMessageTypes } from '../..';

export const Cell = (props: any) => {
  const { sendJsonMessage } = useWebSocket('ws://localhost:3000', { share: true });
  const dispatch = useDispatch();
  const board = useSelector((state: any) => state.game.board);
  const gameId = useSelector((state: any) => state.game.id);
  const selectedFigure = useSelector((state: any) => state.game.selectedFigure.figure);
  const isCellSelected = useSelector((state: any) => state.game.selectedFigure.cell === props.name);
  const isCellHighlithed = useSelector((state: any) => state.game.highlightedCels.includes(props.name));
 
  let cellBody: string;
  if (board.white[props.name]) {
    cellBody = board.white[props.name];
  } else if (board.black[props.name]) {
    cellBody = board.black[props.name];
  }
  
  const cellClick = () => {
    if (isCellHighlithed && !isCellSelected) {
      sendJsonMessage({ 
        type: ServerMessageTypes.Game, 
        body: { 
          type: GameTypes.MAKE_TURN, 
          gameId,
          body: { figure: selectedFigure, cell: props.name }
        } 
      });
    } else {
      dispatch(selectFigure(props.name));
    }
  };

  return (
    <div 
      className={'cell' + (isCellSelected ? ' selected' : '') + (isCellHighlithed ? ' highlighted' : '') }
      onClick={cellClick}
    >{cellBody}</div>
  );
};