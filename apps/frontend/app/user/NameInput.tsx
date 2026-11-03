import { Button, Input } from '@heroui/react';

export function NameInput({ inputVal, setVal, saveName }: any) {
  return (
    <div className="flex items-center mt-1">
      <Input
        size="sm"
        value={inputVal}
        onChange={setVal}
        classNames={{ inputWrapper: 'h-10' }}
      />
      <Button
        onClick={() => saveName(inputVal)}
        className="ml-1 h-10"
        size="sm"
      >
        Save
      </Button>
    </div>
  );
}
