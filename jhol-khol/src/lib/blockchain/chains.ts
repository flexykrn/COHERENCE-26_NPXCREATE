import { defineChain } from 'viem';

/**
 * Hoodi Testnet — Ethereum testnet replacing Holesky
 * Chain ID: 560048
 * Explorer: https://hoodi.etherscan.io
 */
export const hoodi = defineChain({
  id: 560048,
  name: 'Hoodi Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Hoodi Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [
        // Alchemy RPC (more reliable)
        `https://eth-hoodi.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'oYUCGC9BgDUAlST1MG5f7'}`,
        // Public fallback
        'https://ethereum-hoodi-rpc.publicnode.com',
      ],
      webSocket: ['wss://ethereum-hoodi-rpc.publicnode.com'],
    },
    public: {
      http: ['https://ethereum-hoodi-rpc.publicnode.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hoodi Etherscan',
      url: 'https://hoodi.etherscan.io',
      apiUrl: 'https://api.hoodi.etherscan.io/api',
    },
  },
  testnet: true,
});
