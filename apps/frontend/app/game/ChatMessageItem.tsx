import type { ChatMessage } from '@chess/contract';

export function ChatMessageItem({ message }: { message: ChatMessage }) {
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
