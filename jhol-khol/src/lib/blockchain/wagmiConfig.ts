import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { hoodi } from './chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'Jhol Khol — Budget Intelligence Platform',
  projectId: 'jhol-khol-coherence-26',
  chains: [hoodi],
  ssr: true,
});
