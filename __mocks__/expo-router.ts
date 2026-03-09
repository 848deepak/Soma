// __mocks__/expo-router.ts
export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
}));

export const useLocalSearchParams = jest.fn(() => ({}));
export const usePathname = jest.fn(() => '/');
export const useSegments = jest.fn(() => []);
export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
};

export const Link = ({ children }: { children: React.ReactNode }) => children;
export const Redirect = ({ href }: { href: string }) => null;
export const Stack = {
  Screen: () => null,
};
export const Tabs = {
  Screen: () => null,
};
export const Slot = () => null;

import React from 'react';
