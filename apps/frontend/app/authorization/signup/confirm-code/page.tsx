import { ConfirmCodeInput } from './ConfirmCodeInput';

export default function ConfirmCode() {
  return (
    <div className="mt-40 flex flex-1 flex-col items-center justify-center px-10 relative">
      <div className="flex flex-1 flex-col  justify-center space-y-5 max-w-md">
        <div className="flex flex-col space-y-2 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Confirm code</h2>
        </div>
        <ConfirmCodeInput />
      </div>
    </div>
  );
}
