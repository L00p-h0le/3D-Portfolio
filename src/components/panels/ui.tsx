import type { ReactNode } from 'react';

export const panelText = 'text-[12px] leading-[1.8] text-muted mt-0 mx-0 mb-[19px]';
export const panelButton = 'inline-flex items-center justify-center gap-[15px] bg-ink text-surface rounded-[6px] py-[12px] px-[18px] text-[11px] hover:bg-accent hover:text-surface';
export const templateNote = 'text-[9px] leading-[1.6] text-muted mt-[22px]';
export const nightTint = 'night:bg-[#394730] night:text-[#bfcca5]';

export function Title({ children }: { children: ReactNode }) {
  return <h2 id="panel-title" className="font-display font-medium text-[32px] leading-[1.15] tracking-[-1.4px] mt-0 mx-0 mb-[14px]">{children}</h2>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <h3 className="text-[15px] font-medium mt-0 mx-0 mb-[8px]">{children}</h3>;
}

export function Pill({ children }: { children: ReactNode }) {
  return <span className={`text-[8px] tracking-[1px] text-[#7d886b] bg-[#e9eddf] rounded-[3px] py-[5px] px-[7px] inline-block mb-[14px] ${nightTint}`}>{children}</span>;
}

export function TemplateFields({ rows }: { rows: [string, string][] }) {
  return (
    <div className="border-t border-line mt-[18px]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between items-center border-b border-line py-[13px] px-0 text-[10px]">
          <span>{label}</span><span className="text-muted">{value}</span>
        </div>
      ))}
    </div>
  );
}

export const toBeAdded = (...labels: string[]): [string, string][] => labels.map(label => [label, 'To be added']);
