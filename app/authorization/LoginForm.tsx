'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserState } from '@/context/UserContext';
import { userLogin, getProfile } from '@/requests';
import { useNotification } from '@/context/NotificationContext';
import { Button, Input, Spacer } from '@nextui-org/react';

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
        <Input
          label="Email"
          value={email}
          labelPlacement="outside"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
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
