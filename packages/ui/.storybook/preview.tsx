import { type ReactNode, useEffect } from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';
import { HeroUIProvider } from '@heroui/react';
import './preview.css';

function ThemeFrame({
  theme,
  children,
}: {
  theme: 'light' | 'dark';
  children: ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return (
    <HeroUIProvider>
      <div className="bg-background text-foreground min-h-screen p-4">
        {children}
      </div>
    </HeroUIProvider>
  );
}

const withTheme: Decorator = (Story, context) => (
  <ThemeFrame theme={context.globals.theme === 'light' ? 'light' : 'dark'}>
    <Story />
  </ThemeFrame>
);

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
  },
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [withTheme],
};

export default preview;
