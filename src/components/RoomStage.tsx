import type { MutableRefObject, RefObject } from 'react';
import { HOTSPOTS, type RoomAction } from '../lib/room';

interface Props {
  containerRef: RefObject<HTMLDivElement>;
  labelRefs: MutableRefObject<HTMLElement[]>;
  labelsHidden: boolean;
  loading: 'loading' | 'ready' | 'failed';
  status: string;
  onHotspot: (action: RoomAction) => void;
  onReset: () => void;
  onToggleLabels: () => void;
}

const viewButton = 'w-[30px] h-[30px] border border-line rounded-[5px] text-[18px] aria-[pressed=false]:opacity-50 mobile:w-[28px] mobile:h-[28px]';

export function RoomStage({ containerRef, labelRefs, labelsHidden, loading, status, onHotspot, onReset, onToggleLabels }: Props) {
  return (
    <section className="absolute left-[28%] right-[1%] top-[-80px] bottom-[110px] min-h-[420px] touch-none wide:left-[25%] wide:right-[3%] wide:bottom-[130px] tablet:left-[24%] tablet:right-[0%] mobile:left-0 mobile:right-0 mobile:top-[260px] mobile:bottom-auto mobile:h-[440px] mobile:min-h-0 short:bottom-[90px] short:min-h-[350px]" aria-label="Interactive three-dimensional apartment">
      <div ref={containerRef} className="absolute inset-0"></div>
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-label="Room objects">
        {HOTSPOTS.map((hotspot, i) => (
          <button
            key={hotspot.action}
            ref={el => { if (el) labelRefs.current[i] = el; }}
            className={`absolute left-0 top-0 flex items-center gap-[7px] pt-[7px] pr-[11px] pb-[7px] pl-[7px] bg-[#fafaf3ed] text-[#485041] border border-[#fff9] rounded-[6px] shadow-[0_3px_15px_#3b423512] whitespace-nowrap text-[9px] tracking-[.15px] [transition:opacity_.3s,background_.2s] [transform:translate(-50%,-50%)] hover:bg-white hover:text-[#33492e] night:bg-[#354137e8] night:text-[#d8e2c9] night:border-[#5c6d5144] mobile:text-[8px] mobile:pt-[5px] mobile:pr-[7px] mobile:pb-[5px] mobile:pl-[5px] mobile:gap-[5px] mobile:min-h-[28px] ${labelsHidden ? 'opacity-0 pointer-events-none' : 'pointer-events-auto'}`}
            aria-label={hotspot.label}
            onClick={() => onHotspot(hotspot.action)}
          >
            <span className="w-[16px] h-[16px] grid place-items-center bg-[#eceee2] text-[#6a7d4e] rounded-full text-[10px] night:bg-[#556349] night:text-[#d3dfb9] mobile:w-[13px] mobile:h-[13px] mobile:text-[8px]">{hotspot.num}</span>
            <span>{hotspot.label}</span>
            <span className="text-[#8d9483] text-[11px] ml-[7px] mobile:hidden">↗</span>
          </button>
        ))}
      </div>
      <div className={`absolute inset-0 flex items-center justify-center flex-col gap-[12px] bg-bg z-4 text-[12px] text-muted [transition:opacity_.5s] ${loading === 'ready' ? 'opacity-0 pointer-events-none invisible' : ''}`}>
        <span className="text-[42px] text-accent">⌂</span>
        {loading === 'failed'
          ? <><span>The 3D room needs WebGL.</span><span>Use the navigation below to explore the portfolio.</span></>
          : <span>Making room for you<span className="animate-pulse-dots">...</span></span>}
      </div>
      {/* Not shown on screen; screen readers still hear what the room is doing. */}
      <span className="sr-only" role="status">{status}</span>
      <div className="absolute right-[5%] bottom-0 flex gap-[6px] mobile:right-[7%] mobile:bottom-[32px]">
        <button className={viewButton} title="Reset room view" aria-label="Reset room view" onClick={onReset}>↺</button>
        <button className={viewButton} title="Toggle object labels" aria-label="Toggle object labels" aria-pressed={!labelsHidden} onClick={onToggleLabels}>⌖</button>
      </div>
    </section>
  );
}
