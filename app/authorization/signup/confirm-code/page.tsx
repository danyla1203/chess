'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { codeConfirm } from '@/requests';
import { useNotification } from '@/context/NotificationContext';

export default function ConfirmCode() {
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
    <form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <div className="mb-4">
        <label
          className="block text-gray-700 text-sm font-bold mb-2"
          htmlFor="email"
        >
          Code
        </label>
        <input
          onChange={(e) => setCode(e.target.value)}
          value={code}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="code"
          type="text"
          placeholder="Code"
        />
      </div>
      <button
        onClick={verifyCode}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        type="button"
      >
        Send code
      </button>
    </form>
  );
}
