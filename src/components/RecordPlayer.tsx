import { useEffect, useRef } from 'react';
import type { MusicPlayer } from '../lib/music';

/**
 * Invisible home of the YouTube iframe that supplies the audio; the vinyl UI is all that's seen.
 * It stays inside the viewport (just transparent) so the browser doesn't throttle it as an off-screen frame.
 */
export function RecordPlayer({ player }: { player: MusicPlayer }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // YouTube swaps this element for its iframe, so it must not be a React-owned node.
    const el = document.createElement('div');
    hostRef.current!.appendChild(el);
    player.mount(el);
  }, [player]);
  return <div ref={hostRef} className="fixed left-0 bottom-0 w-[200px] h-[200px] opacity-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true" />;
}
