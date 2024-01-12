import { InitedGameData } from '../types';
import { TimersController } from './Timers.controller';

export function RightMenu({ initData }: { initData: InitedGameData }) {
  return (
    <div>
      <TimersController maxTime={initData.maxTime} plaingSide={initData.side} />
    </div>
  );
}
