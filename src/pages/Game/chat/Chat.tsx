import * as React from 'react';
import { useSelector } from 'react-redux';
import useWebSocket from 'react-use-websocket';
import { config } from '../../../config';
import { Button, ButtonGroup } from '@mui/material';

import './Chat.scss';

const Message = ({ author, message }: any) => {
  const outputData = new Date();
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
  const { sendJsonMessage } = useWebSocket(`ws://${config.apiDomain}`, {
    share: true,
    queryParams: {
      'Authorization': accessToken,
    },
  });

  const sendMessage = (text: string = inputText) => {
    sendJsonMessage({ 
      action: '/game/chat/message',
      body: { gameId, text }
    });
  };

  return (
    <div className='game__chat'>
      <div className="game__chat__messages">
        { 
          chatMessages.map((messageData: any) => 
            <Message 
              message={messageData.message} 
              author={messageData.author} 
            /> 
          )
        }
      </div>
      <div className="game__chat__input">
        <input 
          className="game__chat__input__message" 
          onChange={(e: any) => setText(e.target.value)} 
          value={inputText}
        />
        <div className="game__chat__input__quick-messages">
          <ButtonGroup variant="contained" aria-label="outlined primary button group">
            <Button onClick={() => sendMessage('Good game!')}>GG</Button>
            <Button onClick={() => sendMessage('Well played!')}>WP</Button>
            <Button >HF</Button>
          </ButtonGroup>
        </div>
        <Button onClick={() => sendMessage()}>Send</Button>
      </div>
    </div>
  );
};