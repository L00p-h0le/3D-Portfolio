import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ownerTime, profile, socials } from '../../data/profile';
import { safeURL, validEmail } from '../../lib/safeUrl';

type AppId = 'projects' | `project-${number}` | `app-${number}` | 'stack' | 'readme' | 'contact';
interface Win { id: AppId; x: number; y: number; min?: boolean; max?: boolean }
interface App { id: AppId; label: string; icon: ReactNode }

/** A folder with paper peeking out of it: one sheet per image, fanned. */
const folder = (images: string[] = []) => (
  <span className="relative block w-[54px] h-[44px]">
    <span className="absolute left-0 top-0 w-[22px] h-[10px] rounded-t-[4px] bg-[#e8c780]" />
    <span className="absolute inset-x-0 bottom-0 top-[5px] rounded-[6px] bg-[#c99a4e]" />
    {images.slice(0, 3).map((src, i) => (
      <img key={src} className="absolute w-[28px] h-[20px] object-cover rounded-[2px] border border-[#fff] shadow-[0_1px_2px_#0003]" style={{ left: 6 + i * 9, top: 3 + i * 1.5, rotate: `${(i - 1) * 7}deg` }} src={src} alt="" />
    ))}
    <span className="absolute inset-x-0 bottom-0 top-[16px] rounded-[6px] bg-gradient-to-b from-[#e3be78] to-[#cfa257] shadow-[0_3px_8px_#0004]" />
  </span>
);
/** An app icon: the app's own logo (public/desktop/icons) on a rounded tile. */
const logo = (icon: string, bg: string) => (
  <span className="grid place-items-center w-[48px] h-[48px] rounded-[12px] shadow-[0_3px_8px_#0004] border border-[#00000014]" style={{ background: bg }}>
    <img className="w-[28px] h-[28px]" src={`desktop/icons/${icon}`} alt="" draggable={false} />
  </span>
);
const tile = (bg: string, glyph: ReactNode) => (
  <span className={`grid place-items-center w-[48px] h-[48px] rounded-[12px] ${bg} shadow-[0_3px_8px_#0004] font-mono text-[18px] font-bold`}>{glyph}</span>
);

// What sits in the dock. Each project opens from inside the Projects folder.
const APPS: App[] = [
  { id: 'projects', label: 'Projects', icon: folder(profile.projects.map(p => p.image).filter(Boolean)) },
  ...profile.apps.map((a, i) => ({ id: `app-${i}` as AppId, label: a.title, icon: logo(a.icon, a.tile) })),
  { id: 'stack', label: 'Stack.app', icon: tile('bg-[#9ab793] text-[#233b35]', '{}') },
  { id: 'readme', label: 'Readme.txt', icon: tile('bg-[#f3f1e9] text-[#303b32]', '¶') },
  { id: 'contact', label: 'Say hello', icon: tile('bg-[#c8693f] text-[#f3ead6]', '@') },
];
const PROJECT_APPS: App[] = profile.projects.map((p, i) => ({ id: `project-${i}` as AppId, label: p.title || `Project 0${i + 1}`, icon: folder(p.image ? [p.image] : []) }));
// The default wallpaper; the page's relative base keeps this path working on GitHub Pages.
const WALLPAPER = 'desktop/wallpaper.jpg';
// Every window opens at the same size.
const WIN_W = 680, WIN_H = 500;
const app = (id: AppId) => [...APPS, ...PROJECT_APPS].find(a => a.id === id)!;

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
    if (open && !dialog.open) { dialog.showModal(); dialog.focus(); setWins([]); }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const tick = () => setTime(new Intl.DateTimeFormat('en', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: ownerTime.zone }).format(new Date()));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [open]);

  // Windows are kept in z-order, the last one on top. Minimised windows stay in the list, hidden.
  const focus = (id: AppId) => setWins(ws => { const w = ws.find(x => x.id === id); return w ? [...ws.filter(x => x.id !== id), w] : ws; });
  const launch = (id: AppId) => setWins(ws => {
    const w = ws.find(x => x.id === id);
    if (w) return [...ws.filter(x => x.id !== id), { ...w, min: false }];
    const n = ws.length % 6;
    return [...ws, { id, x: Math.max(16, innerWidth / 2 - WIN_W / 2) + n * 30, y: 56 + n * 26 }];
  });
  const close = (id: AppId) => setWins(ws => ws.filter(w => w.id !== id));
  const patch = (id: AppId, change: Partial<Win>) => setWins(ws => ws.map(w => w.id === id ? { ...w, ...change } : w));
  const visible = wins.filter(w => !w.min);
  const top = visible[visible.length - 1]?.id;

  return (
    <dialog
      ref={ref}
      aria-label="Prabhat's desktop"
      tabIndex={-1}
      onClose={onClose}
      className="fixed inset-0 m-0 p-0 border-0 outline-none w-screen h-dvh max-w-none max-h-none overflow-hidden text-ink bg-white backdrop:bg-white open:animate-os-in [font-family:'DM_Sans',sans-serif]"
    >
      {/* Wallpaper */}
      <div className="absolute inset-0 bg-white bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${WALLPAPER})` }} />

      {/* Menu bar */}
      <header className="relative z-20 h-[34px] flex items-center gap-[18px] px-[16px] bg-[#ffffffcc] border-b border-[#0000000f] [backdrop-filter:blur(12px)] text-[12px] text-[#1c1c1c]">
        <span className="text-[#1c1c1c99] mobile:hidden">{profile.name}’s desktop</span>
        <span className="ml-auto tabular-nums text-[#1c1c1cb3]">{time} · {ownerTime.label}</span>
      </header>

      {/* Windows */}
      {wins.map((w, z) => (
        <Window key={w.id} win={w} z={z} active={w.id === top} onFocus={() => focus(w.id)} onClose={() => close(w.id)}
          onMinimise={() => patch(w.id, { min: true })} onZoom={() => patch(w.id, { max: !w.max })} onMove={(x, y) => patch(w.id, { x, y })}>
          <AppBody id={w.id} onOpen={launch} />
        </Window>
      ))}

      {/* Dock */}
      <footer className="absolute z-[60] left-1/2 bottom-[14px] -translate-x-1/2 flex items-end gap-[10px] py-[8px] px-[12px] max-w-[calc(100vw-16px)] mobile:gap-[3px] mobile:px-[8px] rounded-[18px] bg-[#ffffffb3] border border-[#00000014] [backdrop-filter:blur(16px)] shadow-[0_10px_30px_#0005]">
        {APPS.map(a => (
          <button key={a.id} className={`relative flex flex-col items-center mobile:w-[32px] [transition:transform_.15s] hover:-translate-y-[6px] hover:scale-110`} title={a.label} aria-label={`Open ${a.label}`} onClick={() => launch(a.id)}>
            <span className="scale-[.8] origin-bottom mobile:scale-[.56]">{a.icon}</span>
            <span className={`w-[4px] h-[4px] rounded-full mt-[2px] ${wins.some(x => x.id === a.id) ? 'bg-[#1c1c1c]' : 'bg-transparent'}`} />
          </button>
        ))}
        <span className="w-px self-stretch bg-[#00000026] mx-[2px]" />
        <button className="grid place-items-center shrink-0 w-[38px] h-[38px] mb-[6px] mobile:w-[30px] mobile:h-[30px] mobile:text-[13px] rounded-[10px] bg-[#1c1c1c] text-white text-[16px] hover:bg-black" aria-label="Back to the room" title="Back to the room" onClick={() => ref.current?.close()}>⏻</button>
      </footer>
    </dialog>
  );
}

/** A traffic-light symbol drawn on a 12×12 grid so it sits exactly in the middle of its dot. */
function Glyph({ d }: { d: string }) {
  return <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 block w-[9px] h-[9px] opacity-0 group-hover/lights:opacity-100" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d={d} /></svg>;
}

function Window({ win, z, active, onFocus, onClose, onMinimise, onZoom, onMove, children }: {
  win: Win; z: number; active: boolean; onFocus: () => void; onClose: () => void; onMinimise: () => void; onZoom: () => void; onMove: (x: number, y: number) => void; children: ReactNode;
}) {
  const a = app(win.id);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (win.max || (e.target as HTMLElement).closest('button')) return;
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const x = Math.min(Math.max(e.clientX - drag.current.dx, -WIN_W + 120), innerWidth - 120);
    const y = Math.min(Math.max(e.clientY - drag.current.dy, 34), innerHeight - 80);
    onMove(x, y);
  };
  const onUp = () => { drag.current = null; setDragging(false); };
  // Every window is the same size; a zoomed one fills the space between the menu bar and the dock.
  const frame = win.max
    ? { left: 8, top: 42, width: 'calc(100vw - 16px)', height: 'calc(100dvh - 138px)' }
    : { left: win.x, top: win.y, width: `min(${WIN_W}px, calc(100vw - 32px))`, height: `min(${WIN_H}px, calc(100dvh - 150px))` };
  const light = 'relative p-0 w-[13px] h-[13px] rounded-full';
  return (
    <section
      role="dialog"
      aria-label={a.label}
      hidden={win.min}
      className={`absolute flex flex-col rounded-[12px] overflow-hidden bg-surface border border-[#ffffff40] shadow-[0_24px_60px_#0007] animate-win-in ${dragging ? '' : '[transition:left_.2s,top_.2s,width_.2s,height_.2s]'} mobile:left-[8px]! mobile:top-[42px]! mobile:w-[calc(100vw-16px)]! mobile:h-[calc(100dvh-130px)]!`}
      style={{ ...frame, zIndex: 30 + z, display: win.min ? 'none' : undefined }}
      onPointerDown={onFocus}
    >
      <div
        className={`flex items-center gap-[8px] h-[36px] px-[12px] shrink-0 border-b border-line select-none touch-none ${win.max ? '' : 'cursor-grab active:cursor-grabbing'} ${active ? 'bg-[#ecebe1] night:bg-[#34413a]' : 'bg-[#f3f2ea] night:bg-[#2e3a34]'}`}
        onPointerDown={onDown} onPointerMove={onDrag} onPointerUp={onUp} onPointerCancel={onUp}
        onDoubleClick={e => { if (!(e.target as HTMLElement).closest('button')) onZoom(); }}
      >
        {/* Traffic lights: hovering the group reveals their symbols, as on macOS. */}
        <div className="group/lights flex items-center gap-[8px]">
          <button className={`${light} bg-[#e0705a] text-[#6b1d10]`} aria-label={`Close ${a.label}`} title="Close" onClick={onClose}><Glyph d="M3.5 3.5l5 5M8.5 3.5l-5 5" /></button>
          <button className={`${light} bg-[#e3b75a] text-[#7a5413]`} aria-label={`Minimise ${a.label}`} title="Minimise" onClick={onMinimise}><Glyph d="M2.5 6h7" /></button>
          <button className={`${light} bg-[#7fae6c] text-[#24501a]`} aria-label={win.max ? `Restore ${a.label}` : `Zoom ${a.label}`} title={win.max ? 'Restore' : 'Zoom'} onClick={onZoom}><Glyph d="M6 2.5v7M2.5 6h7" /></button>
        </div>
        {/* The negative margin offsets the traffic lights so the title stays centred on the window. */}
        <span className="flex-1 text-center text-[12px] font-medium text-muted -ml-[55px] pointer-events-none truncate">{a.label}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </section>
  );
}

function AppBody({ id, onOpen }: { id: AppId; onOpen: (id: AppId) => void }) {
  if (id === 'projects') return <ProjectsFolder onOpen={onOpen} />;
  if (id.startsWith('app-')) return <InstalledApp index={Number(id.slice(4))} />;
  if (id.startsWith('project-')) return <ProjectApp index={Number(id.slice(8))} />;
  if (id === 'stack') return <StackApp />;
  if (id === 'readme') return <ReadmeApp />;
  return <ContactApp />;
}

/** The Projects folder, Finder-style: one card per project; opening one launches its own window. */
function ProjectsFolder({ onOpen }: { onOpen: (id: AppId) => void }) {
  return (
    <div className="p-[18px]">
      <p className="text-[11px] text-muted m-0 mb-[14px]">{profile.projects.length} items · click one to open it</p>
      <ul className="grid grid-cols-3 gap-[14px] list-none p-0 m-0 mobile:grid-cols-1">
        {profile.projects.map((p, i) => {
          const image = p.image && safeURL(p.image);
          return (
            <li key={i}>
              <button className="group w-full text-left rounded-[10px] p-[6px] hover:bg-[#0000000a] focus-visible:bg-[#00000012] night:hover:bg-[#ffffff0d]" onClick={() => onOpen(`project-${i}`)}>
                {image
                  ? <img className="block w-full aspect-[16/10] object-cover object-top rounded-[7px] border border-line shadow-[0_4px_12px_#0002] [transition:transform_.2s] group-hover:-translate-y-[2px]" src={image} alt="" />
                  : <span className="grid place-items-center w-full aspect-[16/10] rounded-[7px] bg-line text-muted text-[10px]">No screenshot</span>}
                <span className="block mt-[9px] text-[13px] font-semibold">{p.title || `Project 0${i + 1}`}</span>
                <span className="block text-[10.5px] text-muted truncate">{p.tags.slice(0, 3).join(' · ')}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One of the apps on the desktop: what it is, how it gets used, and a link to the real thing. */
function InstalledApp({ index }: { index: number }) {
  const a = profile.apps[index];
  const url = safeURL(a.url);
  return (
    <article>
      <div className={`relative h-[140px] bg-gradient-to-br ${a.hero} overflow-hidden`}>
        <img className="absolute -right-[18px] -bottom-[30px] w-[170px] h-[170px] opacity-20 rotate-[-8deg]" src={`desktop/icons/${a.icon}`} alt="" />
        <div className="absolute left-[22px] bottom-[18px] flex items-center gap-[14px] text-white">
          <span className="grid place-items-center w-[52px] h-[52px] rounded-[14px] shadow-[0_6px_16px_#0005]" style={{ background: a.tile }}>
            <img className="w-[30px] h-[30px]" src={`desktop/icons/${a.icon}`} alt="" />
          </span>
          <div>
            <span className="text-[9px] tracking-[1.6px] uppercase opacity-80">{a.kind}</span>
            <h2 className="font-display text-[30px] font-semibold tracking-[-1px] leading-none mt-[3px] mb-0">{a.title}</h2>
          </div>
        </div>
      </div>
      <div className="p-[22px]">
        <p className="text-[12.5px] leading-[1.75] text-muted m-0">{a.blurb}</p>
        {a.stats && (
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[10px] mt-[18px] mb-0">
            {a.stats.map(s => <Stat key={s.label} {...s} />)}
          </dl>
        )}
        {url && <a className="inline-flex items-center gap-[10px] mt-[20px] bg-ink text-surface rounded-[7px] py-[11px] px-[18px] text-[11px] hover:bg-accent" href={url} target="_blank" rel="noopener noreferrer">Open {a.title} ↗</a>}
      </div>
    </article>
  );
}

function Stat({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };
  return (
    <div className="rounded-[8px] border border-line bg-bg py-[10px] px-[12px]">
      <dt className="flex items-center justify-between gap-[8px] text-[9px] tracking-[1.2px] uppercase text-muted">
        {label}
        {copy && value && <button className="normal-case tracking-normal text-[10px] leading-none py-[3px] px-[8px] -my-[4px] rounded-full border border-line hover:text-ink" onClick={onCopy}>{copied ? 'Copied' : 'Copy'}</button>}
      </dt>
      <dd className={`m-0 mt-[4px] text-[14px] font-semibold ${value ? '' : 'text-muted font-normal text-[12px]'}`}>{value || 'To be added'}</dd>
    </div>
  );
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
