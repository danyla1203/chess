'use client';

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from '@heroui/react';

export type DropdownContent = {
  href: string;
  name: string;
  onclick?: () => void;
};

export interface DropdownUiProps {
  label: string;
  contents: DropdownContent[];
}

export function DropdownUi({ label, contents }: DropdownUiProps) {
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="bordered">{label}</Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Static Actions">
        {contents.map((content: DropdownContent) => (
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
