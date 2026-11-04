import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ownerTime, profile, socials } from '../../data/profile';
import { safeURL, validEmail } from '../../lib/safeUrl';

type AppId = `project-${number}` | 'stack' | 'readme' | 'contact';
interface Win { id: AppId; x: number; y: number }
interface App { id: AppId; label: string; icon: ReactNode; width: number }

const folder = (image?: string) => (
  <span className="relative block w-[54px] h-[44px]">
    <span className="absolute left-0 top-0 w-[22px] h-[10px] rounded-t-[4px] bg-[#e8c780]" />
    <span className="absolute inset-x-0 bottom-0 top-[5px] rounded-[6px] bg-gradient-to-b from-[#e3be78] to-[#cfa257] shadow-[0_3px_8px_#0004] overflow-hidden">
      {image && <img className="absolute right-[5px] bottom-[5px] w-[26px] h-[18px] object-cover rounded-[2px] border border-[#fff8] rotate-[-6deg]" src={image} alt="" />}
    </span>
  </span>
);
const tile = (bg: string, glyph: string) => (
  <span className={`grid place-items-center w-[48px] h-[48px] rounded-[12px] ${bg} shadow-[0_3px_8px_#0004] font-mono text-[18px] font-bold`}>{glyph}</span>
);

const APPS: App[] = [
  ...profile.projects.map((p, i) => ({ id: `project-${i}` as AppId, label: p.title || `Project 0${i + 1}`, icon: folder(p.image), width: 600 })),
  { id: 'stack', label: 'Stack.app', icon: tile('bg-[#9ab793] text-[#233b35]', '{}'), width: 540 },
  { id: 'readme', label: 'Readme.txt', icon: tile('bg-[#f3f1e9] text-[#303b32]', '¶'), width: 460 },
  { id: 'contact', label: 'Say hello', icon: tile('bg-[#c8693f] text-[#f3ead6]', '@'), width: 400 },
];
// The default wallpaper; the page's relative base keeps this path working on GitHub Pages.
const WALLPAPER = 'desktop/wallpaper.jpg';
const app = (id: AppId) => APPS.find(a => a.id === id)!;

/**
 * The computer on the desk, full screen: a small desktop OS holding the projects and the tech stack.
 * It is its own modal dialog; closing it (the dock's ⏻ button, Escape) returns to the room.
 */
export function Desktop({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [wins, setWins] = useState<Win[]>([]);
  const [time, setTime] = useState('');

  useEffect(() => {
    const dialog = ref.current!;
    // Opens to a clean desktop; nothing launches until the visitor picks something.
    if (open && !dialog.open) { dialog.showModal(); setWins([]); }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const tick = () => setTime(new Intl.DateTimeFormat('en', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: ownerTime.zone }).format(new Date()));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [open]);

  const focus = (id: AppId) => setWins(ws => { const w = ws.find(x => x.id === id); return w ? [...ws.filter(x => x.id !== id), w] : ws; });
  const launch = (id: AppId) => setWins(ws => {
    if (ws.some(w => w.id === id)) return [...ws.filter(w => w.id !== id), ws.find(w => w.id === id)!];
    const n = ws.length;
    return [...ws, { id, x: 190 + n * 34, y: 64 + n * 30 }];
  });
  const close = (id: AppId) => setWins(ws => ws.filter(w => w.id !== id));
  const move = (id: AppId, x: number, y: number) => setWins(ws => ws.map(w => w.id === id ? { ...w, x, y } : w));

  return (
    <dialog
      ref={ref}
      aria-label="Prabhat's desktop"
      onClose={onClose}
      className="fixed inset-0 m-0 p-0 border-0 w-screen h-dvh max-w-none max-h-none overflow-hidden text-ink bg-white backdrop:bg-white open:animate-os-in [font-family:'DM_Sans',sans-serif]"
    >
      {/* Wallpaper */}
      <div className="absolute inset-0 bg-white bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${WALLPAPER})` }} />

      {/* Menu bar */}
      <header className="relative z-20 h-[34px] flex items-center gap-[18px] px-[16px] bg-[#ffffffcc] border-b border-[#0000000f] [backdrop-filter:blur(12px)] text-[12px] text-[#1c1c1c]">
        <span className="font-semibold">inside.os</span>
        <span className="text-[#1c1c1c99] mobile:hidden">{profile.name}’s desktop</span>
        <span className="ml-auto tabular-nums text-[#1c1c1cb3]">{time} · {ownerTime.label}</span>
      </header>

      {/* Desktop icons */}
      <nav className="relative z-10 grid grid-flow-row auto-rows-max gap-[18px] p-[22px] w-max mobile:grid-cols-4 mobile:w-full mobile:gap-[10px] mobile:p-[16px]" aria-label="Desktop apps">
        {APPS.map(a => (
          <button key={a.id} className="group flex flex-col items-center gap-[7px] w-[86px] p-[6px] rounded-[8px] hover:bg-[#0000000d] focus-visible:bg-[#00000014] mobile:w-auto" onClick={() => launch(a.id)}>
            <span className="h-[48px] grid place-items-center">{a.icon}</span>
            <span className="text-[11px] leading-[1.25] text-center text-[#1c1c1c] font-medium line-clamp-2">{a.label}</span>
          </button>
        ))}
      </nav>

      {/* Windows */}
      {wins.map((w, z) => (
        <Window key={w.id} win={w} z={z} active={z === wins.length - 1} onFocus={() => focus(w.id)} onClose={() => close(w.id)} onMove={(x, y) => move(w.id, x, y)}>
          <AppBody id={w.id} />
        </Window>
      ))}

      {/* Dock */}
      <footer className="absolute z-[60] left-1/2 bottom-[14px] -translate-x-1/2 flex items-end gap-[10px] py-[8px] px-[12px] max-w-[calc(100vw-16px)] mobile:gap-[2px] mobile:px-[8px] rounded-[18px] bg-[#ffffffb3] border border-[#00000014] [backdrop-filter:blur(16px)] shadow-[0_10px_30px_#0005]">
        {APPS.map(a => (
          <button key={a.id} className="relative flex flex-col items-center mobile:w-[38px] [transition:transform_.15s] hover:-translate-y-[6px] hover:scale-110" title={a.label} aria-label={`Open ${a.label}`} onClick={() => launch(a.id)}>
            <span className="scale-[.8] origin-bottom mobile:scale-[.62]">{a.icon}</span>
            <span className={`w-[4px] h-[4px] rounded-full mt-[2px] ${wins.some(x => x.id === a.id) ? 'bg-[#1c1c1c]' : 'bg-transparent'}`} />
          </button>
        ))}
        <span className="w-px self-stretch bg-[#00000026] mx-[2px]" />
        <button className="grid place-items-center w-[38px] h-[38px] mb-[6px] rounded-[10px] bg-[#1c1c1c] text-white text-[16px] hover:bg-black" aria-label="Back to the room" title="Back to the room" onClick={() => ref.current?.close()}>⏻</button>
      </footer>
    </dialog>
  );
}

/** A traffic-light symbol drawn on a 12×12 grid so it sits exactly in the middle of its dot. */
function Glyph({ d }: { d: string }) {
  return <svg className="w-[9px] h-[9px] opacity-0 group-hover/lights:opacity-100" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d={d} /></svg>;
}

function Window({ win, z, active, onFocus, onClose, onMove, children }: { win: Win; z: number; active: boolean; onFocus: () => void; onClose: () => void; onMove: (x: number, y: number) => void; children: ReactNode }) {
  const a = app(win.id);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const x = Math.min(Math.max(e.clientX - drag.current.dx, -a.width + 120), innerWidth - 120);
    const y = Math.min(Math.max(e.clientY - drag.current.dy, 34), innerHeight - 80);
    onMove(x, y);
  };
  return (
    <section
      role="dialog"
      aria-label={a.label}
      className={`absolute flex flex-col max-h-[calc(100dvh-140px)] rounded-[12px] overflow-hidden bg-surface border border-[#ffffff40] shadow-[0_24px_60px_#0007] animate-win-in mobile:left-[8px]! mobile:right-[8px] mobile:top-[42px]! mobile:w-auto! mobile:max-h-[calc(100dvh-130px)]`}
      style={{ left: win.x, top: win.y, width: `min(${a.width}px, calc(100vw - 32px))`, zIndex: 30 + z }}
      onPointerDown={onFocus}
    >
      <div className={`flex items-center gap-[8px] h-[36px] px-[12px] shrink-0 border-b border-line cursor-grab active:cursor-grabbing select-none touch-none ${active ? 'bg-[#ecebe1] night:bg-[#34413a]' : 'bg-[#f3f2ea] night:bg-[#2e3a34]'}`} onPointerDown={onDown} onPointerMove={onDrag} onPointerUp={() => { drag.current = null; }}>
        {/* Traffic lights: hovering the group reveals their symbols, as on macOS. Red closes. */}
        <div className="group/lights flex items-center gap-[8px]">
          <button className="w-[13px] h-[13px] rounded-full bg-[#e0705a] grid place-items-center text-[#6b1d10]" aria-label={`Close ${a.label}`} title="Close" onClick={onClose}><Glyph d="M3 3l6 6M9 3l-6 6" /></button>
          <span className="w-[13px] h-[13px] rounded-full bg-[#e3b75a] grid place-items-center text-[#7a5413]" aria-hidden="true"><Glyph d="M2.5 6h7" /></span>
          <span className="w-[13px] h-[13px] rounded-full bg-[#7fae6c] grid place-items-center text-[#24501a]" aria-hidden="true"><Glyph d="M6 2.5v7M2.5 6h7" /></span>
        </div>
        {/* The negative margin offsets the traffic lights so the title stays centred on the window. */}
        <span className="flex-1 text-center text-[12px] font-medium text-muted -ml-[55px] pointer-events-none truncate">{a.label}</span>
      </div>
      <div className="overflow-auto">{children}</div>
    </section>
  );
}

function AppBody({ id }: { id: AppId }) {
  if (id.startsWith('project-')) return <ProjectApp index={Number(id.slice(8))} />;
  if (id === 'stack') return <StackApp />;
  if (id === 'readme') return <ReadmeApp />;
  return <ContactApp />;
}

function ProjectApp({ index }: { index: number }) {
  const p = profile.projects[index];
  const url = safeURL(p.url);
  const image = p.image && safeURL(p.image);
  return (
    <article>
      {image
        ? <img className="block w-full aspect-[16/8.5] object-cover object-top border-b border-line" src={image} alt={`${p.title} screenshot`} />
        : <div className="aspect-[16/8.5] grid place-items-center bg-line text-muted text-[11px]">No screenshot yet</div>}
      <div className="p-[22px]">
        <span className="text-[9px] tracking-[1.4px] text-muted font-medium">PROJECT 0{index + 1}</span>
        <h2 className="font-display text-[26px] font-semibold tracking-[-.8px] mt-[4px] mb-[10px]">{p.title || 'Untitled project'}</h2>
        <p className="text-[12.5px] leading-[1.75] text-muted m-0">{p.description || 'Details to be added.'}</p>
        {p.tags.length > 0 && (
          <ul className="flex flex-wrap gap-[6px] list-none p-0 mt-[16px] mb-0">
            {p.tags.map(t => <li key={t} className="text-[10px] py-[4px] px-[9px] rounded-full bg-[#e9eddf] text-[#55624a] night:bg-[#394730] night:text-[#bfcca5]">{t}</li>)}
          </ul>
        )}
        {url && <a className="inline-flex items-center gap-[10px] mt-[20px] bg-ink text-surface rounded-[7px] py-[11px] px-[18px] text-[11px] hover:bg-accent" href={url} target="_blank" rel="noopener noreferrer">Open live site ↗</a>}
      </div>
    </article>
  );
}

function StackApp() {
  const groups = profile.stack.reduce<Record<string, string[]>>((acc, s) => { (acc[s.category] ??= []).push(s.name); return acc; }, {});
  return (
    <div className="p-[22px]">
      <div className="flex items-center gap-[14px] mb-[20px]">
        <span className="grid place-items-center w-[52px] h-[52px] rounded-[14px] bg-[#9ab793] text-[#233b35] font-mono text-[20px] font-bold">{'{}'}</span>
        <div>
          <h2 className="font-display text-[20px] font-semibold tracking-[-.5px] m-0">The tools behind the things</h2>
          <p className="text-[11px] text-muted m-0 mt-[3px]">{profile.stack.length} tools · {Object.keys(groups).length} categories</p>
        </div>
      </div>
      {Object.keys(groups).length === 0 && <p className="text-[12px] text-muted">To be added.</p>}
      <div className="grid gap-[14px]">
        {Object.entries(groups).map(([category, names]) => (
          <section key={category} className="grid grid-cols-[110px_1fr] gap-[12px] items-start border-t border-line pt-[12px] mobile:grid-cols-1 mobile:gap-[6px]">
            <h3 className="text-[10px] tracking-[1px] uppercase text-muted font-medium m-0 pt-[5px]">{category}</h3>
            <div className="flex flex-wrap gap-[6px]">
              {names.map(n => <span key={n} className="text-[12px] py-[5px] px-[10px] rounded-[6px] border border-line bg-bg">{n}</span>)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ReadmeApp() {
  return (
    <pre className="m-0 p-[22px] font-mono text-[12px] leading-[1.8] whitespace-pre-wrap text-ink">
      <span className="text-accent"># {profile.name || 'Hello'}</span>{'\n'}
      <span className="text-muted">{profile.role}</span>{'\n\n'}
      {profile.bio || 'To be added.'}{'\n\n'}
      <span className="text-accent">## Elsewhere</span>{'\n'}
      {'- '}<a className="underline" href={socials.github} target="_blank" rel="noopener noreferrer">GitHub</a>{'\n'}
      {'- '}<a className="underline" href={socials.twitter} target="_blank" rel="noopener noreferrer">X</a>
    </pre>
  );
}

function ContactApp() {
  const email = profile.email && validEmail(profile.email);
  return (
    <div className="p-[22px]">
      <h2 className="font-display text-[22px] font-semibold tracking-[-.6px] mt-0 mb-[8px]">Good things start with a hello.</h2>
      <p className="text-[12px] leading-[1.7] text-muted mt-0 mb-[18px]">Have a project in mind, an interesting idea, or just a good song? Let’s talk.</p>
      {email && <a className="inline-flex bg-ink text-surface rounded-[7px] py-[11px] px-[18px] text-[11px] hover:bg-accent" href={`mailto:${email}`}>{email} ↗</a>}
      <div className="flex gap-[16px] mt-[16px] text-[12px]">
        {profile.links.filter(l => safeURL(l.url)).map(l => <a key={l.url} className="underline" href={safeURL(l.url)} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}
      </div>
    </div>
  );
}
