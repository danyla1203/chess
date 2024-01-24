export function Timer({ time }: { time: number }) {
  const minutes = Math.floor(time / (1000 * 60));
  const seconds = Math.round((time - minutes * 1000 * 60) / 1000);

  let beautySeconds;
  if (seconds === 0) beautySeconds = '00';
  else beautySeconds = seconds < 10 ? `0${seconds}` : seconds;

  const beautyMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return (
    <div className="text-4xl w-32">
      {beautyMinutes}:{beautySeconds}
    </div>
  );
}
