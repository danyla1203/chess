const pad = (value: number) => (value < 10 ? `0${value}` : `${value}`);

export function Timer({ time }: { time: number }) {
  const totalSeconds = Math.ceil(time / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="text-4xl w-32">
      {pad(minutes)}:{pad(seconds)}
    </div>
  );
}
