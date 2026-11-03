import { useState } from 'react';
import { outfits } from '../../data/outfits';
import { profile } from '../../data/profile';
import { Icon } from '../Icon';
import { Pill, Subtitle, TemplateFields, Title, nightTint, panelText, templateNote, toBeAdded } from './ui';

const actionButton = 'py-[10px] px-[15px] border border-line rounded-[5px] text-[10px]';

export function AboutPanel({ outfitDay, onWave, onBack }: { outfitDay: number; onWave: () => Promise<void>; onBack: () => void }) {
  const [waving, setWaving] = useState(false);
  const wave = async () => { setWaving(true); try { await onWave(); } finally { setWaving(false); } };
  return (
    <>
      <div className={`text-[35px] w-[70px] h-[70px] bg-[#e2e8d7] rounded-full grid place-items-center mt-[4px] mx-0 mb-[22px] ${nightTint}`}>
        <Icon name="person" className="w-[32px] h-[32px]" />
      </div>
      <Pill>THE PERSON IN THE CHAIR</Pill>
      <Title>{profile.name ? `Hey, I’m ${profile.name}.` : 'A person, not just a portfolio.'}</Title>
      {profile.role && <Subtitle>{profile.role}</Subtitle>}
      <p className={panelText}>{profile.bio || 'This little room is a place to share what I make, what I’m learning, and the things that make a workday feel like mine.'}</p>
      {!profile.name && <TemplateFields rows={toBeAdded('Your name', 'Your story')} />}
      <div className="flex gap-[8px] mt-[20px]">
        <button className={actionButton} disabled={waving} onClick={wave}>Say hi 👋</button>
        <button className={actionButton} onClick={onBack}>Back to work ↗</button>
      </div>
      <p className={templateNote}>Today’s outfit: {outfits[outfitDay].name}. A new color for each day of the week.</p>
    </>
  );
}
