import type { PanelType } from '../lib/room';
import { RoomToolbar } from './RoomToolbar';

interface Props { night: boolean; onToggleNight: () => void; onAction: (type: PanelType) => void }

export function Header({ night, onToggleNight, onAction }: Props) {
  return (
    <header className="h-[100px] px-[4.2%] flex justify-end items-center relative z-5 mobile:h-[76px] mobile:px-[6%] short:h-[78px]">
      <nav className="flex items-center gap-[24px] mobile:gap-[16px]" aria-label="Main navigation">
        <RoomToolbar night={night} onToggle={onToggleNight} />
        <button className="inline-flex items-center justify-center h-[42px] px-[22px] border border-[#bec3b2] rounded-[6px] text-[12px] hover:bg-[#e9eddf] night:hover:bg-[#47543f] mobile:h-[34px] mobile:px-[14px] mobile:text-[10px]" onClick={() => onAction('contact')}>
          Say hello
        </button>
      </nav>
    </header>
  );
}
