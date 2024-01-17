import { Timer } from './Timers';
import { useConfigContext } from '../context';
import { useTimers } from '../context/Timer';

export function TimersController() {
  const { w, b, addTime } = useTimers();
  const { side } = useConfigContext();

  return (
    <div className="h-32 w-full flex pl-9 items-center">
      <div className="flex flex-col items-end h-full justify-around">
        {side === 'b' ? <Timer time={w} /> : <Timer time={b} />}
        {side === 'b' ? <Timer time={b} /> : <Timer time={w} />}
      </div>
      <div className="flex relative right-5 h-full">
        <button
          onClick={addTime}
          className="mt-6 bg-green-500 text-white size-5 rounded-md text-sm flex items-center justify-center"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            ></path>
          </svg>
        </button>
      </div>
    </div>
  );
}
