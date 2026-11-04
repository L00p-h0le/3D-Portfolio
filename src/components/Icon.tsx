import type { ReactNode } from 'react';

export type IconName = 'drawer' | 'monitor' | 'person' | 'music' | 'shirt' | 'folder' | 'note';

const icons: Record<IconName, ReactNode> = {
  drawer: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M10 6h4M10 12h4M10 18h4"/></>,
  monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4M8 8l-2 2 2 2m8-4 2 2-2 2m-5 1 2-6"/></>,
  person: <><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  music: <><path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/></>,
  shirt: <path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z"/>,
  note: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 2v3M15 2v3M8 10h8M8 14h8M8 18h5"/></>,
  folder: <><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M8 13h8M12 9v8"/></>,
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}
