import { CUSTOM_TRACK, type MusicPlayer } from '../lib/music';

export function MiniPlayer({ player, onToggle, onOpen }: { player: MusicPlayer; onToggle: () => void; onOpen: () => void }) {
  const state = player.index === CUSTOM_TRACK ? `Your audio · ${player.playing ? 'playing' : 'paused'}` : `Original ambient loop · ${player.playing ? 'playing' : 'sound off'}`;
  return (
    <aside className="flex items-center gap-[12px] absolute bottom-[40px] left-[5.2%] z-3 wide:bottom-[55px] tablet:left-[4%] mobile:left-1/2 mobile:[transform:translateX(-50%)] mobile:bottom-auto mobile:top-[850px] mobile:whitespace-nowrap short:bottom-[27px]" aria-label="Music player">
      <button className="w-[43px] h-[43px] [background:repeating-radial-gradient(circle,#3b4338_0,#3b4338_2px,#505747_3px,#353d32_4px)] rounded-full grid place-items-center shrink-0 shadow-[0_3px_10px_#0002] playing:animate-spin-record" aria-label={player.playing ? 'Pause music' : 'Play music'} onClick={onToggle}>
        <span className="bg-[#d3d7b6] text-[#536044] text-[12px] rounded-full w-[17px] h-[17px] grid place-items-center">♪</span>
      </button>
      <div>
        <span className="block text-[7px] tracking-[1.1px] text-muted font-medium tablet:text-[6px]">A LITTLE BACKGROUND COMPANY</span>
        <button className="text-[11px] font-medium pt-[5px] px-0 pb-[3px] block" onClick={onOpen}>{player.title} <span className="ml-[18px] text-[10px] text-muted">↗</span></button>
        <span className="text-[8px] text-muted">{state}</span>
      </div>
      <div className="h-[15px] flex items-center gap-[2px] ml-[8px] tablet:hidden" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(i => <i key={i} className="w-[2px] h-[3px] bg-[#9aa686] even:h-[8px] nth-3:h-[13px] playing:animate-equalizer playing:even:[animation-delay:-.4s]"></i>)}
      </div>
    </aside>
  );
}
