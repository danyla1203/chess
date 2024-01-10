import { InitedGameData } from '../types';
import { Timers } from './Timers';

export function RightMenu({ initData }: { initData: InitedGameData }) {
  return (
    <div>
      <Timers initData={initData} />
    </div>
  );
}
