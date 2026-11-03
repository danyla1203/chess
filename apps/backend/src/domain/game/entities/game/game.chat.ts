import type { ChatMessageSnapshot } from './game.types';

export type Message = {
  id: number;
  text: string;
  author: {
    id: number;
    name: string;
  };
  date: Date;
};

type Author = { userId: number; name: string };

export class GameChat {
  messages: Message[] = [];

  public addMessage(message: string, { userId, name }: Author) {
    const messageObj = {
      id: Math.floor(Math.random() * 100000),
      text: message,
      author: { id: userId, name },
      date: new Date(),
    };
    this.messages.push(messageObj);
    return messageObj;
  }

  public toSnapshot(): ChatMessageSnapshot[] {
    return this.messages.map((m) => ({ ...m, date: m.date.toISOString() }));
  }

  public static fromSnapshot(messages: ChatMessageSnapshot[]): GameChat {
    const chat = new GameChat();
    chat.messages = messages.map((m) => ({ ...m, date: new Date(m.date) }));
    return chat;
  }
}
