import { useEffect, useRef, useState } from 'react';
import { playlist } from '../../data/profile';
import { thumbnail, type MusicPlayer } from '../../lib/music';
import { Pill, Title, panelText, templateNote } from './ui';

interface Props {
  player: MusicPlayer;
  audioAction: (fn: () => Promise<void> | void) => void;
  onVolume: (value: number) => void;
}

// How long the tonearm takes to swing onto the record; matches its CSS transition.
const NEEDLE_MS = 700;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const iconButton = 'w-[34px] h-[34px] rounded-full grid place-items-center text-[13px] text-muted hover:text-ink aria-pressed:text-accent';

/** Re-render every frame while mounted and playing, for the progress bar and the tonearm creep. */
function useFrame(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = () => { setTick(t => t + 1); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

export function MusicPanel({ player, audioAction, onVolume }: Props) {
  const [rpm, setRpm] = useState<33 | 45>(33);
  // While the arm swings down, the needle hasn't touched the record yet, so the music waits for it.
  const [dropping, setDropping] = useState(false);
  const dropTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(dropTimer.current), []);
  useFrame(player.playing);
  /** Run a play-starting action, but only after the needle lands. Pausing, or acting mid-song, happens at once. */
  const withNeedle = (fn: () => Promise<void> | void) => {
    if (player.playing || dropping) { audioAction(fn); return; }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { audioAction(fn); return; }
    setDropping(true);
    dropTimer.current = setTimeout(() => { setDropping(false); audioAction(fn); }, NEEDLE_MS);
  };
  const toggle = () => player.playing ? audioAction(() => player.toggle()) : withNeedle(() => player.play());
  const { now, total } = player.time();
  const progress = player.progress();
  // Arm swings from its rest onto the lead-in groove, then creeps toward the label as the track plays.
  const armAngle = player.playing || player.waiting || dropping ? 18 + progress * 10 : player.started ? 12 : 0;
  const unavailable = player.status === 'unavailable';
  const loading = player.status !== 'ready' && !unavailable;

  return (
    <>
      <Pill>GOOD COMPANY</Pill>
      <Title>Put a record on.<br />Stay a little.</Title>
      <p className={panelText}>
        Spinning <a className="text-ink underline decoration-line underline-offset-[3px]" href={playlist.url} target="_blank" rel="noopener noreferrer">{playlist.name} ↗</a>, my playlist from YouTube Music. Tap the record to drop the needle.
      </p>

      {/* Turntable: every size is a share of the plinth width, so it scales with the panel. */}
      <div className="relative w-full aspect-[340/290] rounded-[14px] mb-[20px] shadow-[0_10px_24px_#3b2a1a2e,inset_0_1px_0_#ffffff40] [background:linear-gradient(150deg,#b88f66,#94704c_60%,#83623f)] night:[background:linear-gradient(150deg,#6f5640,#594431_60%,#4b392a)]">
        <div className="absolute inset-[3%] rounded-[10px] border border-[#00000014]" />
        <button
          className="absolute left-[4%] top-1/2 -translate-y-1/2 w-[76.5%] aspect-square rounded-full shadow-[0_6px_14px_#0006] [background:radial-gradient(circle,#0000_63%,#ffffff0d_64%,#0000_65%,#0000_75%,#ffffff0d_76%,#0000_77%),repeating-radial-gradient(circle,#1d211e_0,#1d211e_1.5px,#2a302b_2.5px,#191c1a_3.5px)]"
          aria-label={player.playing ? 'Lift the needle (pause)' : 'Drop the needle (play)'}
          disabled={unavailable}
          onClick={toggle}
        >
          {/* Sheen stays still like light on real vinyl. */}
          <span className="absolute inset-0 rounded-full [background:conic-gradient(from_200deg,#0000_0_8%,#ffffff1c_14%,#0000_22%,#0000_58%,#ffffff14_64%,#0000_72%)]" />
          {/* The label ring and album art turn together. */}
          <span
            className="absolute inset-0 animate-spin-record [animation-play-state:paused] playing:[animation-play-state:running]"
            style={{ animationDuration: rpm === 33 ? '7s' : '5s' }}
          >
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 260 260" aria-hidden="true">
              <circle cx="130" cy="130" r="90" fill="#c8693f" />
            </svg>
            <span className="absolute inset-[17.3%] rounded-full overflow-hidden bg-[#2a302b] grid place-items-center text-[10px] tracking-[1.5px] text-[#f3ead6] shadow-[inset_0_0_0_1px_#0003]">
              {player.current ? <CoverArt key={player.current} id={player.current} /> : unavailable ? 'OFFLINE' : loading ? 'WARMING UP…' : ''}
            </span>
          </span>
          <span className="absolute left-1/2 top-1/2 w-[2.4%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9cbb8] shadow-[0_1px_2px_#0008] z-1" />
        </button>

        {/* Tonearm: pivots at the top right and swings onto the record while playing. */}
        <button
          className="absolute top-[9.6%] right-[8.8%] w-[3%] h-[69%] origin-[50%_0] [transition:transform_.7s_cubic-bezier(.3,.7,.3,1)] motion-reduce:transition-none"
          style={{ transform: `rotate(${armAngle}deg)` }}
          aria-label={player.playing ? 'Lift the tonearm (pause)' : 'Lower the tonearm (play)'}
          disabled={unavailable}
          onClick={toggle}
        >
          <span className="absolute left-1/2 top-0 w-[260%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d9d6c2] shadow-[0_2px_5px_#0005] border-[3px] border-[#a39c76]" />
          <span className="absolute left-1/2 top-0 w-[45%] h-[92%] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#bdb68f] via-[#e6e1c4] to-[#a39c76] shadow-[2px_3px_4px_#0004]" />
          <span className="absolute left-1/2 bottom-0 w-[160%] h-[10%] -translate-x-1/2 rounded-[2px] bg-[#333a35] shadow-[1px_3px_4px_#0006]" />
        </button>

        {/* Plinth hardware: speed switch and power light. */}
        <div className="absolute right-[4.5%] bottom-[5%] flex flex-col items-end gap-[6px]">
          <span className={`w-[7px] h-[7px] rounded-full ${player.playing ? 'bg-[#e8603c] shadow-[0_0_8px_#e8603c]' : 'bg-[#5d4733]'}`} aria-hidden="true" />
          <div className="flex rounded-full bg-[#00000026] p-[2px] text-[8px] font-semibold">
            {([33, 45] as const).map(speed => (
              <button key={speed} className={`py-[3px] px-[6px] rounded-full ${rpm === speed ? 'bg-[#f3ead6] text-[#4b392a]' : 'text-[#f3ead6b3]'}`} aria-pressed={rpm === speed} onClick={() => setRpm(speed)}>{speed}</button>
            ))}
          </div>
        </div>
      </div>

      {unavailable ? (
        <p className={panelText}>Couldn’t reach YouTube from here. It may be blocked by an extension or network. <a className="text-ink underline" href={playlist.url} target="_blank" rel="noopener noreferrer">Open the playlist on YouTube Music ↗</a></p>
      ) : (
        <>
          <div className="mb-[14px]">
            <p className="text-[15px] font-medium m-0 truncate">{(player.waiting || dropping) && !player.playing ? 'Dropping the needle…' : player.title || 'Nothing on the platter yet'}</p>
            <p className="text-[10px] text-muted mt-[4px] mb-0 truncate">{player.author || `${playlist.name} · YouTube Music`}</p>
          </div>
          <div className="flex items-center gap-[10px] text-[9px] text-muted tabular-nums">
            <span>{clock(now)}</span>
            <div className="relative flex-1 h-[3px] rounded-full bg-line overflow-hidden"><div className="absolute inset-y-0 left-0 bg-accent rounded-full" style={{ width: `${progress * 100}%` }} /></div>
            <span>{total ? clock(total) : '–:––'}</span>
          </div>

          <div className="flex items-center justify-between my-[18px]">
            <button className={iconButton} aria-label="Shuffle" aria-pressed={player.shuffle} onClick={() => audioAction(() => player.setShuffle(!player.shuffle))}>⇄</button>
            <button className={`${iconButton} text-[16px]`} aria-label="Previous track" onClick={() => withNeedle(() => player.next(-1))}>⏮</button>
            <button
              className="w-[52px] h-[52px] rounded-full bg-ink text-surface text-[16px] grid place-items-center shadow-[0_6px_16px_#17251b33] hover:bg-accent"
              aria-label={player.playing ? 'Pause' : 'Play'}
              onClick={toggle}
            >{player.waiting || dropping ? <span className="animate-pulse-dots">•••</span> : player.playing ? 'Ⅱ' : '▶'}</button>
            <button className={`${iconButton} text-[16px]`} aria-label="Next track" onClick={() => withNeedle(() => player.next())}>⏭</button>
            <label className="flex items-center gap-[6px] text-[12px] text-muted" title="Volume">
              <span aria-hidden="true">{player.volume === 0 ? '🔇' : '🔊'}</span>
              <input className="w-[64px] accent-accent" type="range" min="0" max="1" step="0.01" value={player.volume} aria-label="Volume" onChange={e => onVolume(Number(e.target.value))} />
            </label>
          </div>

          {player.ids.length > 0 && (
            <>
              <div className="flex items-baseline justify-between mb-[10px]">
                <span className="text-[8px] tracking-[1.1px] text-muted font-medium">THE CRATE</span>
                <span className="text-[9px] text-muted">{player.index + 1} / {player.ids.length}</span>
              </div>
              <div className="flex gap-[10px] overflow-x-auto pb-[10px] -mx-[4px] px-[4px] pt-[6px] [scrollbar-width:thin]">
                {player.ids.map((id, i) => (
                  <Sleeve key={`${id}-${i}`} id={id} player={player} active={i === player.index} onPick={() => withNeedle(() => player.select(i))} />
                ))}
              </div>
            </>
          )}
        </>
      )}
      <p className={templateNote}>Music streams from YouTube Music. It keeps playing while you look around the room.</p>
    </>
  );
}

/** One record sleeve in the crate. Its title is only fetched once it scrolls into view. */
function Sleeve({ id, player, active, onPick }: { id: string; player: MusicPlayer; active: boolean; onPick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current!;
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setSeen(true); io.disconnect(); } });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => { if (active) ref.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }, [active]);
  const info = seen ? player.track(id) : undefined;
  return (
    <button ref={ref} className="w-[74px] shrink-0 text-left group" aria-current={active || undefined} aria-label={info?.title ?? 'Play this track'} onClick={onPick}>
      <span className={`relative block w-[74px] h-[74px] rounded-[4px] overflow-hidden bg-line shadow-[0_3px_8px_#0002] [transition:transform_.25s] group-hover:-translate-y-[3px] ${active ? '-translate-y-[4px] ring-2 ring-accent' : ''}`}>
        <img className="w-full h-full object-cover" src={thumbnail(id)} alt="" loading="lazy" />
        {active && (
          <span className="absolute right-[5px] bottom-[5px] h-[13px] flex items-end gap-[2px]" aria-hidden="true">
            {[0, 1, 2].map(i => <i key={i} className="w-[2px] h-[11px] bg-white even:h-[6px] playing:animate-equalizer playing:even:[animation-delay:-.4s]" />)}
          </span>
        )}
      </span>
      <span className={`block text-[9px] leading-[1.35] mt-[6px] line-clamp-2 ${active ? 'text-accent' : 'text-muted'}`}>{info?.title ?? ' '}</span>
    </button>
  );
}

/**
 * Album art for the label. YouTube's 1280×720 cover has the square art centred, so cropping it to a circle shows just the art.
 * Some videos lack that size (YouTube serves a 120px placeholder); then use the 480×360 one, whose art sits inside black
 * letterbox bars covering a quarter of its height, so it's scaled up past them.
 */
function CoverArt({ id }: { id: string }) {
  const [hq, setHq] = useState(false);
  return (
    <img
      className={`w-full h-full object-cover ${hq ? 'scale-[1.34]' : ''}`}
      src={thumbnail(id, hq ? 'hqdefault' : 'maxresdefault')}
      alt=""
      draggable={false}
      onLoad={e => { if (!hq && e.currentTarget.naturalWidth <= 120) setHq(true); }}
      onError={() => setHq(true)}
    />
  );
}
