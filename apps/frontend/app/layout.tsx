import React from 'react';

import { NavbarMenu, Notifications, PendingGame } from '@/components';
import { UserProvider } from '@/context/UserContext';
import { WebSocketProvider } from '@/context/SocketContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { GameListProvider } from '@/context/GameListContext';

import './globals.css';
import { HeroUIProviders } from './heroui.provider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <HeroUIProviders>
          <UserProvider>
            <WebSocketProvider>
              <NotificationProvider>
                <Notifications />
                <GameListProvider>
                  <NavbarMenu actions={<PendingGame />} />
                  {children}
                </GameListProvider>
              </NotificationProvider>
            </WebSocketProvider>
          </UserProvider>
        </HeroUIProviders>
      </body>
    </html>
  );
}
