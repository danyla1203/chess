'use client';

import { useUserState } from '@/app/lib/context/UserContext';
import { getProfile } from '@/app/lib/request';
import { getGoogleProfile } from '@/app/lib/request/getGoogleUser';
import { useSearchParams, useRouter } from 'next/navigation';

export default function GoogleOauthConfirmation() {
  const code = useSearchParams().get('code');
  const { profile, updateUser } = useUserState();
  const router = useRouter();
  if (!code) throw new Error('No code');

  if (!profile) {
    void getGoogleProfile(code)?.then((profile) => {
      if (profile.action === 'user:created') {
        router.push(
          `/authorization/signup/complete-signup?email=${profile.email}`,
        );
      } else if (profile.action === 'user:authorized') {
        localStorage.setItem('accessToken', profile.access);
        localStorage.setItem('refreshToken', profile.refresh);
        void getProfile(profile.access).then((userData) => {
          updateUser(userData);
          router.push('/');
        });
      }
    });
  }

  return null;
}
