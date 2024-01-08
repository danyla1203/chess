'use client';

import { EmailInput } from './EmailInput';

export default function Signup() {
  return (
    <div className="mt-40 flex flex-1 flex-col items-center justify-center px-10 relative">
      <div className="flex flex-1 flex-col  justify-center space-y-5 max-w-md">
        <div className="flex flex-col space-y-2 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">
            Send confirmation link
          </h2>
        </div>
        <EmailInput />
      </div>
    </div>
  );
}
