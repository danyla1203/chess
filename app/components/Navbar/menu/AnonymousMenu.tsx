import * as React from 'react';
import { DropdownUi } from '@/ui/Dropdown';

export function AnonymousMenu() {
  const contents = [
    { href: '/user', name: 'Profile' },
    { href: '/authorization', name: 'Login' },
  ];
  return <DropdownUi label="Anonymous" contents={contents} />;
}
