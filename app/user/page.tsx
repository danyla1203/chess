'use client';

import { useRouter } from 'next/navigation';
import { useUserState } from '@/context/UserContext';

export default function UserProfile() {
  const { profile } = useUserState();

  const router = useRouter();

  if (!profile) {
    router.push('/');
    return null;
  }

  return (
    <div className="container mx-auto mt-8">
      <div className="max-w-md mx-auto bg-white rounded-md overflow-hidden shadow-md">
        <div className="p-6">
          <div className="flex items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {profile.name}
              </h1>
              <p className="text-sm text-gray-600">
                Chess Rating:{' '}
                <span className="font-bold text-gray-800">1800</span>
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-gray-700">
              Welcome to my chess profile! I love playing strategic games and
              improving my chess skills. Let's have a great game!
            </p>
          </div>
        </div>
        <div className="bg-gray-100 p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-gray-600">
                Games Played
              </p>
              <p className="text-sm font-bold text-gray-800">120</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600">Wins</p>
              <p className="text-sm font-bold text-gray-800">80</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600">Losses</p>
              <p className="text-sm font-bold text-gray-800">40</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
