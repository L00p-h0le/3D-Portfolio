import type { MouseEvent } from 'react';
import type { PanelType } from '../lib/room';

interface Props { onAction: (type: PanelType) => void; onBrand: (e: MouseEvent) => void }

export function Header({ onAction, onBrand }: Props) {
  return (
    <header className="h-[100px] px-[4.2%] flex justify-between items-center relative z-5 mobile:h-[76px] mobile:px-[6%] short:h-[78px]">
      <a href="#" className="flex items-center gap-[11px]" aria-label="inside home" onClick={onBrand}>
        <svg className="w-[32px] h-[32px] mobile:w-[27px]" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 12 16 6l11 6v13l-11 6L5 25V12Z" stroke="currentColor" strokeWidth="1.6"/><path d="m5 12 11 6 11-6M16 18v13M10 9l11 6v7" stroke="currentColor" strokeWidth="1.6"/></svg>
        <span className="font-display font-extrabold text-[30px] tracking-[-1.6px] mobile:text-[27px]">inside<span className="text-[#8b9b68]">.</span></span>
        <span className="text-[8px] tracking-[1.8px] mt-[6px] mr-0 mb-0 ml-[17px] pl-[24px] border-l border-line tablet:hidden">A LIVING PORTFOLIO</span>
      </a>
      <nav className="flex items-center gap-[32px] text-[12px] tablet:gap-[20px]" aria-label="Main navigation">
        <button className="py-[12px] px-0 mobile:hidden" onClick={() => onAction('projects')}>Selected work <span className="text-[9px] ml-[7px] text-muted">03</span></button>
        <button className="py-[12px] px-0 mobile:hidden" onClick={() => onAction('about')}>The person</button>
        <button className="py-[11px] px-[17px] border border-[#bec3b2] rounded-[6px] mobile:text-[10px] mobile:py-[8px] mobile:px-[12px]" onClick={() => onAction('contact')}>
          Say hello <span className="text-[16px] ml-[17px] text-ink mobile:ml-[9px]">↗</span>
        </button>
      </nav>
    </header>
  );
}
