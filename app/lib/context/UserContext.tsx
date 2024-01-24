'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getProfile } from '@/requests';
import { User, useWebSocket } from './SocketContext';
import { GameData } from './GameListContext';
import { getAnonymousGames } from '../utils';

type Profile = {
  userId: number;
  name: string;
  isAuthorized: boolean;
  games: GameData[];
  wins: number;
  draws: number;
  looses: number;
};

export type UserState = {
  profile: Profile | null;
  updateUser: (data: any) => void;
  removeUser: () => void;
};

export const UserContext = createContext<UserState>({
  profile: null,
  updateUser: () => {
    throw new Error('User context is not set');
  },
  removeUser: () => {
    throw new Error('User context is not set');
  },
});

export const useUserState = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('No context provided');
  }
  return context;
};

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const socket = useWebSocket();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoaded, setStatus] = useState(false);

  useEffect(() => {
    // TODO: Potential XSS vulnerability, change it in future
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      getProfile(accessToken)
        .then((profile) => {
          if (!profile.error) {
            setProfile(profile);
          }
          setStatus(true);
        })
        .catch(() => setStatus(true));
    } else setStatus(true);

    socket.on(User.anonymousToken, ({ userId }) => {
      const gamesStats = getAnonymousGames(userId);
      setProfile({
        userId,
        name: 'Anonymous',
        isAuthorized: false,
        ...gamesStats,
      });
    });
  }, []);
  const stateUser: UserState = {
    profile,
    updateUser: (profile: Profile) => {
      setProfile(profile);
    },
    removeUser: () => {
      setProfile(null);
    },
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <UserContext.Provider value={stateUser}>{children}</UserContext.Provider>
  );
};
