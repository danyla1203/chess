import React from 'react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from '@nextui-org/react';

interface DropdownProps {
  label: string;
  contents: any;
}

export const DropdownUi: React.FC<DropdownProps> = ({ label, contents }) => {
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="bordered">{label}</Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Static Actions">
        {contents.map((content: any) => (
          <DropdownItem
            key={content.href}
            href={content.href}
            onClick={content.onclick ? content.onclick : null}
          >
            {content.name}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};
