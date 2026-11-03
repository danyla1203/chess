import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotificationItem, NotificationStack } from './Notification';

const meta = {
  title: 'Components/Notification',
  component: NotificationStack,
} satisfies Meta<typeof NotificationStack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { notifications: [] },
};

export const Stack: Story = {
  args: {
    notifications: [
      { id: 1, type: 'info', message: 'Game created' },
      { id: 2, type: 'error', message: 'Not enough balance' },
      { id: 3, type: 'info', message: 'Opponent joined' },
    ],
  },
};

export const InfoItem: Story = {
  args: { notifications: [] },
  render: () => <NotificationItem type="info" message="Game created" />,
};

export const ErrorItem: Story = {
  args: { notifications: [] },
  render: () => <NotificationItem type="error" message="Not enough balance" />,
};
