import React from 'react';

import { NavbarMenu, Notifications } from '@/components';
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
          <WebSocketProvider>
            <NotificationProvider>
              <UserProvider>
                <Notifications />
                <GameListProvider>
                  <NavbarMenu />
                  {children}
                </GameListProvider>
              </UserProvider>
            </NotificationProvider>
          </WebSocketProvider>
        </NextuiProviders>
      </body>
    </html>
  );
}
