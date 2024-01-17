'use client';

import { AnonymousMenu } from './menu/AnonymousMenu';
import { AuthorizedMenu } from './menu/AuthorizedMenu';
import { useUserState } from '@/context/UserContext';

export function Profile() {
  const { profile } = useUserState();

  return profile ? <AuthorizedMenu /> : <AnonymousMenu />;
}
