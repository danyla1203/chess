import { useState } from 'react';
import { Input, Button } from '@heroui/react';

export function ChatInputBox({
  addMessage,
}: {
  addMessage: (text: string) => void;
}) {
  const [val, setVal] = useState<string>('');

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
