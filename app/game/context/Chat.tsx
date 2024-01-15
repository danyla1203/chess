import { Emit, Game, useWebSocket } from '@/context/SocketContext';
import { Message } from '../types';

import { useState, useEffect, createContext, useContext } from 'react';
import { useConfigContext } from '.';

type Chat = {
  messages: Message[];
  addMessage: (message: string) => void;
};

const ChatContext = createContext<Chat>({
  messages: [],
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  addMessage: (message: string) => {},
});

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('No context provided');
  }
  return context;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const socket = useWebSocket();
  const cnf = useConfigContext();
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = (text: string) => {
    socket.volatile.emit(Emit.pushMessage, {
      gameId: cnf.gameId,
      text,
    });
  };

  const setUpdateMessages = (message: Message) => {
    const copy = [...messages];
    copy.push(message);
    setMessages(copy);
  };
  console.log(messages);
  useEffect(() => {
    socket.on(Game.message, (newState: Message) => {
      console.log(socket);
      setUpdateMessages(newState);
    });
    return () => {
      socket.off(Game.message);
    };
  }, [messages]);

  return (
    <ChatContext.Provider value={{ messages, addMessage }}>
      {children}
    </ChatContext.Provider>
  );
};
