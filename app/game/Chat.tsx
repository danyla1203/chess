import { useState } from 'react';
import { Input, Card, CardBody, Button } from '@nextui-org/react';
import { useChat } from './context/Chat';
import { Message } from './types';

function InputBox({ addMessage }: { addMessage: (text: string) => void }) {
  const [val, setVal] = useState('');

  const overridedClick = () => {
    addMessage(val);
    setVal('');
  };

  return (
    <>
      <Input
        radius="none"
        value={val}
        onValueChange={setVal}
        type="email"
        placeholder="Message"
        size="sm"
      />
      <Button radius="none" onClick={overridedClick}>
        Send message
      </Button>
    </>
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
        <h5 className="text-lg font-bold text-zinc-400">
          {message.author.name}
        </h5>
        <p className="test-sm">{message.text}</p>
      </div>
      <h4 className="text-sm font-bold text-zinc-400">{beautyTime}</h4>
    </div>
  );
}

export function Chat() {
  const { messages, addMessage } = useChat();

  return (
    <Card className="h-full max-w-80 w-80 min-w-5 rounded-r-none">
      <CardBody>
        <div className="flex flex-col h-[calc(100%-3.5rem)] w-full">
          {messages.map((m) => (
            <MessageItem key={m.id} message={m} />
          ))}
        </div>
      </CardBody>
      <InputBox addMessage={addMessage} />
    </Card>
  );
}
