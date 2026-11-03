import type { Meta, StoryObj } from '@storybook/react-vite';
import { Loader } from './Loader';

const meta = {
  title: 'Components/Loader',
  component: Loader,
} satisfies Meta<typeof Loader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FullScreen: Story = {};

export const InContainer: Story = {
  render: () => (
    <div className="relative h-64 w-64 border border-default-300">
      <Loader />
    </div>
  ),
};
