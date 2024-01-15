import { useState } from 'react';
import { useChat } from './context/Chat';
import { Message } from './types';

function Input({ addMessage }: { addMessage: (text: string) => void }) {
  const [val, setVal] = useState('');

  return (
    <div className="flex flex-col items-center">
      <input
        className="w-full h-8 w-full box-border border-2 border-blue-500 outline-none p-2"
        onChange={(e) => setVal(e.target.value)}
        value={val}
      />
      <button
        className="h-8 w-full box-border bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
        onClick={() => addMessage(val)}
      >
        Send
      </button>
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const outputData = new Date();
  const minutes = outputData.getMinutes();
  const hours = outputData.getHours();
  const beautyMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const beautyHours = hours < 10 ? `0${hours}` : hours;
  const beautyTime = `${beautyHours}:${beautyMinutes}`;
  return (
    <div className="flex justify-between w-full mb-3">
      <div className="items-center w-5/6">
        <h5 className="mr-3 text-lg font-semibold">{message.author.name}</h5>
        <p className="text-gray-700 break-all">{message.text}</p>

        {/* Adding the whitespace-normal class to allow text wrapping */}
      </div>
      <h4 className="text-sm text-gray-500">{beautyTime}</h4>
    </div>
  );
}

export function Chat() {
  const { messages, addMessage } = useChat();

  return (
    <div className="flex flex-col h-full w-76 min-w-52 ml-5 mr-7 bg-white shadow-md p-3">
      <div className="flex flex-col h-[calc(100%-3.5rem)] w-full">
        {messages.map((m) => (
          <MessageItem key={m.id} message={m} />
        ))}
      </div>
      <Input addMessage={addMessage} />
    </div>
  );
}
