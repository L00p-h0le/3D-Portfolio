import { useState } from 'react';
import { profile } from '../../data/profile';
import { Pill, Title, panelText, templateNote } from './ui';

const hand = '[font-family:"Segoe_Print","Bradley_Hand","Comic_Sans_MS",cursive]';

/** The notepad on the drawers: what's on the bench right now. Visitors can tick things off, just for fun. */
export function TodoPanel() {
  const [ticked, setTicked] = useState(() => profile.todo.map(t => Boolean(t.done)));
  const filled = profile.todo.some(t => t.task);
  return (
    <>
      <Pill>CURRENTLY BUILDING</Pill>
      <Title>On my list<br />this week.</Title>
      <p className={panelText}>What’s on the bench right now: projects in progress and the next things I want to ship.</p>
      <div className="relative rotate-[-1deg] rounded-[4px] py-[22px] pr-[18px] pl-[52px] shadow-[0_10px_24px_#3b2a1a24,0_1px_0_#0000000d] [background:linear-gradient(90deg,#0000_40px,#d98a7a_40px,#d98a7a_41.5px,#0000_41.5px),repeating-linear-gradient(#f6f1df_0,#f6f1df_37px,#c9d6df_37px,#c9d6df_38px)] night:[background:linear-gradient(90deg,#0000_40px,#a8655a_40px,#a8655a_41.5px,#0000_41.5px),repeating-linear-gradient(#e8e1c8_0,#e8e1c8_37px,#a9b6be_37px,#a9b6be_38px)] text-[#2f4a3e]">
        <span className="absolute -top-[9px] left-1/2 -translate-x-1/2 w-[90px] h-[20px] bg-[#e3d8b4cc] rotate-[2deg] shadow-[0_1px_2px_#0002]" aria-hidden="true" />
        <h3 className={`${hand} text-[26px] leading-[38px] m-0 mb-[0px]`}>TO DO</h3>
        <ul className="list-none m-0 p-0">
          {profile.todo.map((item, i) => (
            <li key={i} className="min-h-[38px] flex items-start gap-[10px] leading-[38px]">
              <button
                className={`mt-[10px] w-[18px] h-[18px] shrink-0 border-2 border-[#2f4a3e] rounded-[3px] grid place-items-center text-[13px] leading-none ${item.task ? '' : 'opacity-40'}`}
                role="checkbox" aria-checked={ticked[i]} aria-label={item.task || 'Empty task'} disabled={!item.task}
                onClick={() => setTicked(t => t.map((v, j) => j === i ? !v : v))}
              >{ticked[i] ? '✓' : ''}</button>
              <span className="min-w-0">
                <span className={`${hand} text-[16px] ${item.task ? '' : 'text-[#9a9c8c]'} ${ticked[i] ? 'line-through decoration-[#d98a7a] decoration-2' : ''}`}>{item.task || 'to be added…'}</span>
                {item.note && <span className="block text-[11px] leading-[1.4] text-[#6f7a68] -mt-[8px] mb-[8px]">{item.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className={templateNote}>{filled ? 'Tick something off. It only changes here, on your screen.' : 'The list is still being written. Check back soon.'}</p>
    </>
  );
}
