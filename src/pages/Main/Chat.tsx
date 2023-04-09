import * as React from 'react';
import useWebSocket from 'react-use-websocket';
import { config } from '../../config';
import { useSelector } from 'react-redux';

const Message = (props: any) => {
  const date = new Date(props.date);
  const minutes = date.getMinutes();
  const hours = date.getHours();
  const beautyMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const beautyHours = hours < 10 ? `0${hours}` : hours;
  const beautyTime = `${beautyHours}:${beautyMinutes}`;
  return (
    <div className="chat__messages__message">
      <h3 className='chat__messages__message-name'>{ props.user.name }</h3>
      <p className="chat__messages__message-message">{ props.text }</p>
      <h3 className="chat__messages__message-time">{beautyTime}</h3>
    </div>
  );
};

export const Chat = () => {
  const [ text, setText ] = React.useState('');
  const isAuthorized = useSelector((state: any) => state.user.authorized);
  const accessToken = useSelector((state: any) => state.user.accessToken);
  const messages = useSelector((state: any) => state.chat.messages);
  const { sendJsonMessage } = useWebSocket(`ws://${config.apiDomain}`, {
    share: true,
    queryParams: {
      'Authorization': accessToken,
    }, 
  });

  const sendMessage = () => {
    sendJsonMessage({ action: '/chat/push-message', body: { text } });
  };

  let chatInput = null;
  if (isAuthorized) {
    chatInput = (
      <div className="chat__input">
        <input 
          type="text" 
          className="chat__input-inp" 
          value={text} 
          onChange={(e) => setText(e.target.value)}
        />
        <button 
          className="chat__input-send-message"
          onClick={sendMessage}>Send</button>
      </div>
    );
  }
  return (
    <div className='chat'>
      <div className="chat__messages">
        { messages.map((message) => 
          <Message 
            date={message.date} 
            text={message.text}
            user={message.user}
          />
        )}
      </div>
      { chatInput }
    </div>
  );
};
