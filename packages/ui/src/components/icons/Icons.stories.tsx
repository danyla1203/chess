import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@heroui/react';
import { GithubIcon } from './Github';
import { GoogleIcon } from './Google';

const meta = {
  title: 'Components/Icons',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Github: Story = {
  render: () => (
    <div className="fill-foreground">
      <GithubIcon />
    </div>
  ),
};

export const Google: Story = {
  render: () => <GoogleIcon />,
};

export const InButtons: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button type="button" startContent={<GoogleIcon />}>
        Google
      </Button>
      <Button type="button" startContent={<GithubIcon />}>
        Github
      </Button>
    </div>
  ),
};
