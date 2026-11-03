import { outfits } from '../../data/outfits';
import { Icon } from '../Icon';
import { Pill, Subtitle, Title, panelButton, panelText } from './ui';

const WEEK = [1, 2, 3, 4, 5, 6, 0];

export function WardrobePanel({ outfitDay, onPick, onToday }: { outfitDay: number; onPick: (day: number) => void; onToday: () => void }) {
  const outfit = outfits[outfitDay];
  return (
    <>
      <Pill>THE EVERYDAY UNIFORM</Pill>
      <Title>A different day.<br />A different fit.</Title>
      <p className={panelText}>Seven days, seven little moods. The outfit changes with your local day. Try one on.</p>
      <div className="grid grid-cols-[repeat(4,1fr)] gap-[8px] my-[22px] mx-0">
        {WEEK.map(i => (
          <button key={i} className={`py-[14px] px-[6px] border rounded-[8px] flex items-center flex-col gap-[8px] text-[9px] ${i === outfitDay ? 'border-accent bg-[#e8eddf] night:bg-[#394730] night:text-[#bfcca5]' : 'border-line'}`} aria-label={`${outfits[i].day}: ${outfits[i].name}`} aria-pressed={i === outfitDay} onClick={() => onPick(i)}>
            <span style={{ color: outfits[i].color }}><Icon name="shirt" className="w-[30px] h-[30px]" /></span>{outfits[i].day.slice(0, 3)}
          </button>
        ))}
      </div>
      <Subtitle>{outfit.name}</Subtitle>
      <p className={panelText}>{outfit.day}’s color, made for a day in the studio.</p>
      <button className={panelButton} onClick={onToday}>Wear today’s outfit ↗</button>
    </>
  );
}
