import * as React from 'react';
import { DropdownUi } from '@chess/ui';

export function AnonymousMenu() {
  const contents = [
    { href: '/user', name: 'Profile' },
    { href: '/authorization', name: 'Login' },
  ];
  return <DropdownUi label="Anonymous" contents={contents} />;
}
