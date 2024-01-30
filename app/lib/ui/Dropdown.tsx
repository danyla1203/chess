import React from 'react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from '@nextui-org/react';

type Content = { href: string; name: string; onclick?: () => void };
interface DropdownProps {
  label: string;
  contents: Content[];
}

export function DropdownUi({ label, contents }: DropdownProps) {
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="bordered">{label}</Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Static Actions">
        {contents.map((content: Content) => (
          <DropdownItem
            key={content.href}
            href={content.href}
            onClick={content.onclick}
          >
            {content.name}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
