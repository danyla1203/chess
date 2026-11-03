import { Card, CardBody } from '@heroui/react';
import { useChat } from './context/Chat';
import { ChatInputBox } from './ChatInputBox';
import { ChatMessageItem } from './ChatMessageItem';

export function Chat() {
  const { messages, addMessage } = useChat();

  return (
    <Card className="h-full max-w-80 w-80 min-w-5 rounded-r-none">
      <CardBody>
        <div className="flex flex-col w-full">
          {messages.map((m) => (
            <ChatMessageItem key={m.id} message={m} />
          ))}
        </div>
      </CardBody>
      <ChatInputBox addMessage={addMessage} />
    </Card>
  );
}
