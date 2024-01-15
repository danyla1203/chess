import * as React from 'react';
import Link from 'next/link';
import { Dropdown } from '@/ui/Dropdown';

export function AnonymousMenu() {
  return (
    <Dropdown label="Anonymous">
      <Link
        className="block text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        href="/authorization"
      >
        Login
      </Link>
    </Dropdown>
  );
}
