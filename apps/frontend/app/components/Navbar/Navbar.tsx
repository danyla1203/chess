'use client';

import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
} from '@heroui/react';

import { type ReactNode } from 'react';
import { Profile } from './Profile';

export function NavbarMenu({ actions }: { actions?: ReactNode }) {
  return (
    <Navbar position="static">
      <NavbarBrand>
        <h1 className="text-4xl">👾</h1>
        <p className="font-bold text-inherit">Chesser</p>
      </NavbarBrand>
      <NavbarContent className="sm:flex gap-4" justify="center">
        <NavbarItem>
          <Link color="foreground" href="#">
            Game List
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link href="/">Home</Link>
        </NavbarItem>
        <NavbarItem>
          <Link color="foreground" href="#">
            About
          </Link>
        </NavbarItem>
        <NavbarItem>{actions}</NavbarItem>
      </NavbarContent>
      <NavbarContent justify="end">
        <Profile />
      </NavbarContent>
    </Navbar>
  );
}
