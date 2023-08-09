import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, ButtonGroup } from '@mui/material';
import { sendMessage } from '../../../store/slices/ws';

import './Chat.scss';

function Message({ author, text, date }: any) {
  const outputData = new Date();
  const minutes = outputData.getMinutes();
  const hours = outputData.getHours();
  const beautyMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const beautyHours = hours < 10 ? `0${hours}` : hours;
  const beautyTime = `${beautyHours}:${beautyMinutes}`;
  return (
    <div className="game__chat__messages__item" key={date}>
      <h4 className="game__chat__messages__item-name">
        {author.name}
      </h4>
      <h3 className="game__chat__messages__item-message">{text}</h3>
      <h2 className="game__chat__messages__item-time">
        {beautyTime}
      </h2>
    </div>
  );
}

export function GameChat() {
  const [inputText, setText] = React.useState();
  const gameId = useSelector((state: any) => state.game.id);
  const chatMessages = useSelector(
    (state: any) => state.game.chatMessages,
  );
  const dispatch = useDispatch<any>();

  const send = (text: string = inputText) => {
    dispatch(
      sendMessage({
        event: 'chat-message',
        body: { gameId, text },
      }),
    );
  };

  return (
    <div className="game__chat">
      <div className="game__chat__messages">
        {chatMessages.map((messageData: any) => (
          <Message
            key={messageData.id}
            text={messageData.text}
            author={messageData.author}
            date={messageData.date}
          />
        ))}
      </div>
      <div className="game__chat__input">
        <input
          className="game__chat__input__message"
          onChange={(e: any) => setText(e.target.value)}
          value={inputText}
        />
        <div className="game__chat__input__quick-messages">
          <ButtonGroup
            variant="contained"
            aria-label="outlined primary button group"
          >
            <Button onClick={() => send('Good game!')}>GG</Button>
            <Button onClick={() => send('Well played!')}>WP</Button>
            <Button>HF</Button>
          </ButtonGroup>
        </div>
        <Button onClick={() => send()}>Send</Button>
      </div>
    </div>
  );
}
