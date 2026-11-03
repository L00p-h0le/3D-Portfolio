import { tracks } from '../../data/tracks';
import { CUSTOM_TRACK, type MusicPlayer } from '../../lib/music';
import { Pill, Title, panelText, templateNote } from './ui';

interface Props {
  player: MusicPlayer;
  audioAction: (fn: () => Promise<void> | void) => void;
  onVolume: (value: number) => void;
  onChooseFile: () => void;
}

const song = 'w-full flex text-left items-center gap-[12px] py-[15px] px-[6px] border-b border-line text-[12px]';

export function MusicPanel({ player, audioAction, onVolume, onChooseFile }: Props) {
  const pick = (i: number) => audioAction(() => i === player.index ? player.toggle() : player.select(i));
  return (
    <>
      <Pill>GOOD COMPANY</Pill>
      <Title>Put something on.<br />Stay a little.</Title>
      <p className={panelText}>Original ambient loops for a slower kind of browsing. Or bring a song of your own.</p>
      <div className="border-t border-line mb-[20px]">
        {tracks.map((track, i) => (
          <button key={i} className={`${song} ${i === player.index ? 'text-accent' : ''}`} onClick={() => pick(i)}>
            <span className="text-muted text-[9px]">0{i + 1}</span>
            <span>{track.title}<small className="block text-[9px] text-muted mt-[5px]">{track.subtitle}</small></span>
            <span className="ml-auto">{i === player.index && player.playing ? 'Ⅱ' : '▷'}</span>
          </button>
        ))}
        {player.audio && (
          <button className={`${song} ${player.index === CUSTOM_TRACK ? 'text-accent' : ''}`} onClick={() => pick(CUSTOM_TRACK)}>
            <span className="text-muted text-[9px]">04</span>
            <span>{player.customTitle}<small className="block text-[9px] text-muted mt-[5px]">From your device · stays on your device</small></span>
            <span className="ml-auto">▷</span>
          </button>
        )}
      </div>
      <div className="flex items-center justify-center gap-[24px] my-[24px] mx-0">
        <button className="text-[18px]" aria-label="Previous track" onClick={() => audioAction(() => player.next(-1))}>⏮</button>
        <button className="text-[18px] w-[46px] h-[46px] bg-ink text-surface rounded-full" aria-label={`${player.playing ? 'Pause' : 'Play'} music`} onClick={() => audioAction(() => player.toggle())}>{player.playing ? 'Ⅱ' : '▶'}</button>
        <button className="text-[18px]" aria-label="Next track" onClick={() => audioAction(() => player.next())}>⏭</button>
      </div>
      <label className="flex items-center gap-[12px] text-[10px] text-muted mb-[24px]">
        Volume <input className="w-full accent-accent" type="range" min="0" max="1" step="0.01" value={player.volume} aria-label="Music volume" onChange={e => onVolume(Number(e.target.value))} />
      </label>
      <button className="w-full border border-dashed border-[#bfc8b2] p-[14px] rounded-[7px] text-[10px]" onClick={onChooseFile}>＋ Choose an audio file</button>
      <p className={templateNote}>Your file plays locally and is never uploaded. MP3, WAV, or another audio format supported by your browser.</p>
    </>
  );
}
