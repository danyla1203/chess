import type { Meta, StoryObj } from '@storybook/react-vite';
import { DropdownUi } from './Dropdown';

const meta = {
  title: 'Components/Dropdown',
  component: DropdownUi,
} satisfies Meta<typeof DropdownUi>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Anonymous: Story = {
  args: {
    label: 'Anonymous',
    contents: [
      { href: '#profile', name: 'Profile' },
      { href: '#login', name: 'Login' },
    ],
  },
};

export const Authorized: Story = {
  args: {
    label: 'magnus',
    contents: [
      { href: '#profile', name: 'Profile' },
      { href: '#logout', name: 'Logout', onclick: () => undefined },
    ],
  },
};

export const SingleItem: Story = {
  args: {
    label: 'Menu',
    contents: [{ href: '#only', name: 'Only item' }],
  },
};
