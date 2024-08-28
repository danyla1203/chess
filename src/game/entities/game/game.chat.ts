import { Client } from '../Client';

export type Message = {
  id: number;
  text: string;
  author: {
    id: number;
    name: string;
  };
  date: Date;
};

export class GameChat {
  messages: Message[] = [];

  public addMessage(message: string, { userId, name }: Client) {
    const messageObj = {
      id: Math.floor(Math.random() * 100000),
      text: message,
      author: { id: userId, name },
      date: new Date(),
    };
    this.messages.push(messageObj);
    return messageObj;
  }
}
