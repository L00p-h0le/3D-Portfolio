export interface ProfileLink { label: string; url: string }
export interface StackItem { name: string; category: string }
export interface TodoItem { task: string; note?: string; done?: boolean }
export interface Project { title: string; description: string; tags: string[]; url: string; image: string }
export interface Profile {
  name: string;
  role: string;
  bio: string;
  email: string;
  links: ProfileLink[];
  stack: StackItem[];
  projects: Project[];
  todo: TodoItem[];
}

export const socials = { github: 'https://github.com/L00p-h0le', twitter: 'https://x.com/G3ek_God' };
export const playlist = { id: 'PLlYm1svwFJCETsZCv1RwvmXJCLEJZGJNJ', name: 'Vibe 🎧', url: 'https://music.youtube.com/playlist?list=PLlYm1svwFJCETsZCv1RwvmXJCLEJZGJNJ' };
// The wall clock shows the owner's time, not the visitor's. IST has no daylight saving, so a fixed offset is exact.
export const ownerTime = { zone: 'Asia/Kolkata', label: 'India', offsetMinutes: 330 };

export const profile: Profile = {
  name: 'Prabhat',
  role: 'Frontend & Web3 Developer',
  bio: 'I build React and TypeScript frontends and the Solidity contracts behind them. Most recently a Frontend Developer Intern at KAnalysis, shipping role-based dashboards, real-time notifications, and dark mode. On the Web3 side, I write Foundry-tested DeFi contracts with fuzz and invariant suites and deploy them to Sepolia.',
  email: 'kspacey660@gmail.com',
  links: [{ label: 'GitHub', url: socials.github }, { label: 'X', url: socials.twitter }],
  stack: [
    { name: 'TypeScript', category: 'Language' },
    { name: 'JavaScript', category: 'Language' },
    { name: 'Solidity', category: 'Language' },
    { name: 'C++', category: 'Language' },
    { name: 'React', category: 'Framework' },
    { name: 'Tailwind', category: 'Styling' },
    { name: 'TanStack', category: 'Library' },
    { name: 'Wagmi', category: 'Web3' },
    { name: 'Ethers.js', category: 'Web3' },
    { name: 'Foundry', category: 'Smart contracts' },
    { name: 'Hardhat', category: 'Smart contracts' },
    { name: 'Git & GitHub', category: 'Version control' },
  ],
  projects: [
    {
      title: 'UNIDEX',
      description: 'A Uniswap V2-style DEX built from scratch in Solidity 0.8.20+: constant product AMM, TWAP oracle, multi-hop Router, and a protocol fee across 6 contracts with no assembly. 65 unit, fuzz, and invariant tests ran 128,000 randomized mint/burn/swap calls with zero K-invariant violations. Deployed and verified on Sepolia.',
      tags: ['React', 'TypeScript', 'Wagmi', 'Solidity', 'Foundry'],
      url: 'https://dex-flame-nu.vercel.app',
      image: 'projects/unidex.png',
    },
    {
      title: 'Beginnerchef',
      description: 'A multi-pool staking contract with allocPoint-weighted rewards, reward-debt accounting, and timestamp-based emissions from a pre-funded pool. A 20-test suite (unit, fuzz, adversarial, invariants over 128K calls) found a fee-on-transfer fund-theft path, all documented in SECURITY.md. Deployed and verified on Sepolia.',
      tags: ['React', 'TypeScript', 'Solidity', 'Foundry', 'Ethers.js', 'GSAP'],
      url: 'https://beginner-chef-zeta.vercel.app',
      image: 'projects/beginnerchef.png',
    },
    {
      title: 'G33K',
      description: 'A multi-chain HD wallet generator for Ethereum and Solana using BIP39 mnemonics and standard derivation paths. Sensitive mnemonic data lives in a memory-only vault and is never written to storage.',
      tags: ['React', 'TypeScript', 'Tailwind', 'Ethers.js', '@solana/web3.js'],
      url: 'https://geek-blue.vercel.app',
      image: 'projects/g33k.png',
    },
  ],
  // The notepad on the drawers: what you're building right now. Empty tasks show as "To be added".
  // e.g. { task: 'UNIDEX v2', note: 'concentrated liquidity', done: false }
  todo: [
    { task: '' },
    { task: '' },
    { task: '' },
  ],
};
