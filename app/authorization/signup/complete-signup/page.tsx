'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createUser } from '@/requests';
import { useUserState } from '@/context/UserContext';
import { useNotification } from '@/context/NotificationContext';

export default function CompleteSignup() {
  const [userName, setName] = useState('');
  const [password, setPassword] = useState('');
  const { updateUser } = useUserState();
  const { addNotification } = useNotification();

  const email = useSearchParams().get('email');

  const signUp = async () => {
    const res = await createUser(email || '', userName, password);
    if (res.error) {
      addNotification('error', res.error);
    } else {
      const { profile, access, refresh } = res;
      updateUser(profile);
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
    }
  };

  return (
    <form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <div className="mb-4">
        <label
          className="block text-gray-700 text-sm font-bold mb-2"
          htmlFor="email"
        >
          {email}
        </label>
        <label
          className="block text-gray-700 text-sm font-bold mb-2"
          htmlFor="email"
        >
          Username
        </label>
        <input
          onChange={(e) => setName(e.target.value)}
          value={userName}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="email"
          type="text"
          placeholder="Username"
        />
        <label
          className="block text-gray-700 text-sm font-bold mb-2"
          htmlFor="email"
        >
          Password
        </label>
        <input
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="email"
          type="text"
          placeholder="Password"
        />
      </div>
      <button
        onClick={signUp}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        type="button"
      >
        Create account
      </button>
    </form>
  );
}
