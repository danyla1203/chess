import * as React from 'react';
import { useSelector } from 'react-redux';
import useWebSocket from 'react-use-websocket';
import { GameTypes } from '../..';
import { ServerMessageTypes } from '../../WsHandler';

const Message = ({ text, date }: any) => {
  const userName = useSelector((state: any) => state.user.name);
  date = new Date(date);
  const time = `${date.getHours()}:${date.getMinutes()}`;
  return (
    <div className="game__chat__messages__item" key={date}>
      <h4 className='game__chat__messages__item-name'>{userName}</h4>
      <h3 className='game__chat__messages__item-message'>{text}</h3>
      <h2 className='game__chat__messages__item-time'>{time}</h2>
    </div>
  );
};

export const GameChat = () => {
  const [ text, setText ] = React.useState();
  const gameId = useSelector((state: any) => state.game.id);
  const chatMessages = useSelector((state: any) => state.game.chatMessages);
  const accessToken = useSelector((state: any) => state.tokens.accessToken);
  const { sendJsonMessage } = useWebSocket('ws://localhost:3000', {
    share: true,
    queryParams: {
      'Authorization': accessToken,
    },
  });

  const sendMessage = () => {
    sendJsonMessage({ type: ServerMessageTypes.Game, body: { type: GameTypes.CHAT_MESSAGE, body: { gameId, message: { text } } } });
  };

  return (
    <div className='game__chat'>
      <div className="game__chat__messages">
        { chatMessages.map((message: any) => <Message {...message} /> )}
      </div>
      <div className="game__chat__input">
        <input 
          className="game__chat__input__message" 
          onChange={(e: any) => setText(e.target.value)} 
          value={text}
        />
        <button className="game__chat__input__btn" onClick={sendMessage}>Send</button>
        
      </div>
    </div>
  );
};