'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUser } from '@/requests';
import { useUserState } from '@/context/UserContext';
import { useNotification } from '@/context/NotificationContext';

export function SignupForm() {
  const [userName, setName] = useState('');
  const [password, setPassword] = useState('');
  const { updateUser } = useUserState();
  const { addNotification } = useNotification();

  const email = useSearchParams().get('email');
  const router = useRouter();

  const signUp = async () => {
    const res = await createUser(email || '', userName, password);
    if (res.error) {
      addNotification('error', res.error);
    } else {
      const { profile, access, refresh } = res;
      updateUser(profile);
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      router.push('/');
    }
  };

  return (
    <div className="flex flex-col items-start justify-start pt-10 pr-10 pb-10 pl-10 bg-white shadow-2xl rounded-xl relative z-10">
      <p className="w-full text-4xl font-medium text-center leading-snug font-serif">
        Sign up for an account
      </p>
      <div className="relative mt-3">
        <p className="bg-white pt-0 pr-2 pb-0 pl-2 -mt-3 mr-0 mb-0 ml-2 font-medium text-gray-600 absolute">
          {email}
        </p>
      </div>
      <div className="w-full mt-6 mr-0 mb-0 ml-0 relative space-y-8">
        <div className="relative">
          <p className="bg-white pt-0 pr-2 pb-0 pl-2 -mt-3 mr-0 mb-0 ml-2 font-medium text-gray-600 absolute">
            Username
          </p>
          <input
            placeholder="John"
            type="text"
            value={userName}
            onChange={(e) => setName(e.target.value)}
            className="border placeholder-gray-400 focus:outline-none
                  focus:border-black w-full pt-4 pr-4 pb-4 pl-4 mt-2 mr-0 mb-0 ml-0 text-base block bg-white
                  border-gray-300 rounded-md"
          />
        </div>
        <div className="relative">
          <p className="bg-white pt-0 pr-2 pb-0 pl-2 -mt-3 mr-0 mb-0 ml-2 font-medium text-gray-600 absolute">
            Password
          </p>
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border placeholder-gray-400 focus:outline-none
                  focus:border-black w-full pt-4 pr-4 pb-4 pl-4 mt-2 mr-0 mb-0 ml-0 text-base block bg-white
                  border-gray-300 rounded-md"
          />
        </div>
        <div className="relative">
          <button
            onClick={signUp}
            className="w-full inline-block pt-4 pr-5 pb-4 pl-5 text-xl font-medium text-center text-white bg-indigo-500
                  rounded-lg transition duration-200 hover:bg-indigo-600 ease"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
