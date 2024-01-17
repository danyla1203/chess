import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
} from '@nextui-org/react';

import { Profile } from './Profile';
import { PendingGame } from '..';

export function NavbarMenu() {
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
        <NavbarItem>
          <PendingGame />
        </NavbarItem>
      </NavbarContent>
      <NavbarContent justify="end">
        <Profile />
      </NavbarContent>
    </Navbar>
  );
}
