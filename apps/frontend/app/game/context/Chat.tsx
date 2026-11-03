import { Emit, Game, type ChatMessage } from '@chess/contract';
import { useWebSocket } from '@/context/SocketContext';

import { useState, useEffect, createContext, useContext } from 'react';
import { useConfigContext } from '.';

type Chat = {
  messages: ChatMessage[];
  addMessage: (message: string) => void;
};

const ChatContext = createContext<Chat>({
  messages: [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addMessage = (text: string) => {
    socket.volatile.emit(Emit.pushMessage, {
      gameId: cnf.gameId,
      text,
    });
  };

  const setUpdateMessages = (message: ChatMessage) => {
    const copy = [...messages];
    copy.push(message);
    setMessages(copy);
  };

  useEffect(() => {
    socket.on(Game.message, (newState) => {
      setUpdateMessages(newState);
    });
    socket.on(Game.end, () => {
      setUpdateMessages({
        id: -1,
        text: 'Game is over',
        author: { id: -1, name: 'System' },
        date: new Date() + '',
      });
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
