export interface ProfileLink { label: string; url: string }
export interface StackItem { name: string; category: string }
export interface Project { title: string; description: string; tags: string[]; url: string; image: string }
export interface Profile {
  name: string;
  role: string;
  bio: string;
  email: string;
  links: ProfileLink[];
  stack: StackItem[];
  projects: Project[];
}

export const socials = { github: 'https://github.com/L00p-h0le', twitter: 'https://x.com/G3ek_God' };

// Replace these empty fields with your own details. Never displayed as fictional credentials.
export const profile: Profile = {
  name: '',
  role: '',
  bio: '',
  email: '',
  links: [{ label: 'GitHub', url: socials.github }, { label: 'X', url: socials.twitter }],
  stack: [], // { name: 'TypeScript', category: 'Language' }
  projects: [
    { title: '', description: '', tags: [], url: '', image: '' },
    { title: '', description: '', tags: [], url: '', image: '' },
    { title: '', description: '', tags: [], url: '', image: '' },
  ],
};
