import React from 'react';

import { NavbarMenu, Notifications, PendingGame } from '@/components';
import { UserProvider } from '@/context/UserContext';
import { WebSocketProvider } from '@/context/SocketContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { GameListProvider } from '@/context/GameListContext';

import './globals.css';
import { NextuiProviders } from './nextui.provider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <NextuiProviders>
          <NotificationProvider>
            <UserProvider>
              <Notifications />
              <WebSocketProvider>
                <GameListProvider>
                  <NavbarMenu />
                  {children}
                </GameListProvider>
              </WebSocketProvider>
            </UserProvider>
          </NotificationProvider>
        </NextuiProviders>
      </body>
    </html>
  );
}
