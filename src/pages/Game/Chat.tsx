import * as React from 'react';
import { useSelector } from 'react-redux';
import useWebSocket from 'react-use-websocket';
import { GameTypes } from '../..';
import { ServerMessageTypes } from '../../WsHandler';

const Message = ({ author, message }: any) => {
  const outputData = new Date(message.date);
  const minutes = outputData.getMinutes();
  const hours = outputData.getHours();
  const beautyMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const beautyHours = hours < 10 ? `0${hours}` : hours;
  const beautyTime = `${beautyHours}:${beautyMinutes}`;
  return (
    <div className="game__chat__messages__item" key={message.date}>
      <h4 className='game__chat__messages__item-name'>{author.name}</h4>
      <h3 className='game__chat__messages__item-message'>{message.text}</h3>
      <h2 className='game__chat__messages__item-time'>{beautyTime}</h2>
    </div>
  );
};

export const GameChat = () => {
  const [ inputText, setText ] = React.useState();
  const gameId = useSelector((state: any) => state.game.id);
  const chatMessages = useSelector((state: any) => state.game.chatMessages);
  const accessToken = useSelector((state: any) => state.user.accessToken);
  const { sendJsonMessage } = useWebSocket('ws://localhost:3000', {
    share: true,
    queryParams: {
      'Authorization': accessToken,
    },
  });

  const sendMessage = (text: string = inputText) => {
    sendJsonMessage({ 
      type: ServerMessageTypes.Game,
      body: {
        type: GameTypes.CHAT_MESSAGE,
        body: { gameId, message: { text } }
      }
    });
  };

  return (
    <div className='game__chat'>
      <div className="game__chat__messages">
        { chatMessages.map((messageData: any) => <Message message={messageData.message} author={messageData.author} /> )}
      </div>
      <div className="game__chat__input">
        <input 
          className="game__chat__input__message" 
          onChange={(e: any) => setText(e.target.value)} 
          value={inputText}
        />
        <div className="game__chat__input__quick-messages">
          <button 
            className="game__chat__input__quick-messages__btn" 
            onClick={() => sendMessage('Good game!')}
          >GG</button>
          <button 
            className="game__chat__input__quick-messages__btn" 
            onClick={() => sendMessage('Well played!')}
          >WP</button>
          <button 
            className="game__chat__input__quick-messages__btn"
            onClick={() => sendMessage('Have fun!')}
          >HF</button>
        </div>
        <button className="game__chat__input__btn" onClick={() => sendMessage()}>Send</button>
      </div>
    </div>
  );
};