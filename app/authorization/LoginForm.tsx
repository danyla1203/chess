'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserState } from '@/context/UserContext';
import { userLogin, getProfile } from '@/requests';
import { useNotification } from '@/context/NotificationContext';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { updateUser } = useUserState();
  const { addNotification } = useNotification();

  const router = useRouter();

  const login = async () => {
    const data = {
      email,
      password,
    };
    const { access, refresh } = await userLogin(data);
    if (access) {
      await updateUser(await getProfile(access));
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      router.push('/');
    } else addNotification('error', 'Login failed');
  };

  return (
    <form className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          type="text"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          name="email"
          className="mt-1 p-2 w-full border rounded-md focus:border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          name="password"
          className="mt-1 p-2 w-full border rounded-md focus:border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
        />
      </div>
      <div>
        <button
          onClick={login}
          type="button"
          className="w-full bg-black text-white p-2 rounded-md hover:bg-gray-800 focus:outline-none focus:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors duration-300"
        >
          Sign Up
        </button>
      </div>
    </form>
  );
}
