'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { codeConfirm } from '@/requests';
import { useNotification } from '@/context/NotificationContext';

export function ConfirmCodeInput() {
  const [code, setCode] = useState('');
  const router = useRouter();
  const { addNotification } = useNotification();

  const email = useSearchParams().get('email');

  const verifyCode = async () => {
    const res = await codeConfirm(code, email || '');
    if (res.message === 'ok') {
      router.push(`/authorization/signup/complete-signup?email=${email}`);
    } else addNotification('error', res.message);
  };
  return (
    <div className="flex flex-col max-w-md space-y-5">
      <input
        type="text"
        placeholder="Code"
        className="flex px-3 py-2 md:px-4 md:py-3 border-2 border-black rounded-lg font-medium placeholder:font-normal"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button
        onClick={verifyCode}
        type="button"
        className="flex items-center justify-center flex-none px-3 py-2 md:px-4 md:py-3 border-2 rounded-lg font-medium border-black bg-black text-white"
      >
        Confirm email address
      </button>
      <div className="flex justify-center items-center">
        <span className="w-full border border-black"></span>
      </div>
    </div>
  );
}
