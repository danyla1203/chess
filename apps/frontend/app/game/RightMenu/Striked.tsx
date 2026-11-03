export function Striked({ figure, side }: { figure: string; side: 'w' | 'b' }) {
  return (
    <div
      className={`w-7 h-7 bg-center bg-cover ${figure.replace(
        /\d/,
        '',
      )} ${side}`}
      key={`${figure}-b`}
    />
  );
}
