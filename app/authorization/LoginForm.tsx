'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserState } from '@/context/UserContext';
import { userLogin, getProfile } from '@/requests';
import { useNotification } from '@/context/NotificationContext';
import { Button, Input, Spacer } from '@nextui-org/react';

export function LoginForm() {
  const [emailOrName, setEmailOrName] = useState('');
  const [password, setPassword] = useState('');
  const { updateUser } = useUserState();
  const { addNotification } = useNotification();

  const router = useRouter();

  const login = async () => {
    const data = {
      emailOrName,
      password,
    };
    const { access, refresh } = await userLogin(data);
    if (access) {
      updateUser(await getProfile(access));
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      router.push('/');
    } else addNotification('error', 'Login failed');
  };

  return (
    <form className="space-y-4">
      <div>
        <Input
          label="Email or name"
          value={emailOrName}
          labelPlacement="outside"
          placeholder="Email or name"
          onChange={(e) => setEmailOrName(e.target.value)}
        />
        <Spacer y={2} />
        <Input
          label="Password"
          labelPlacement="outside"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <Button fullWidth onClick={login}>
          Sign Up
        </Button>
      </div>
    </form>
  );
}
