import { useState } from 'react';
import { useChat } from './context/Chat';
import { Message } from './types';

function Input({ addMessage }: { addMessage: (text: string) => void }) {
  const [val, setVal] = useState('');

  return (
    <div>
      <input onChange={(e) => setVal(e.target.value)} value={val} />
      <button onClick={() => addMessage(val)}>Send</button>
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  return <div>{message.text}</div>;
}

export function Chat() {
  const { messages, addMessage } = useChat();

  return (
    <div>
      {messages.map((m) => (
        <MessageItem key={m.id} message={m} />
      ))}
      <Input addMessage={addMessage} />
    </div>
  );
}
