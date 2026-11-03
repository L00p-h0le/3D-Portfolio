import { profile } from '../../data/profile';
import { ProjectArt, Pill, Subtitle, TemplateFields, Title, panelText, toBeAdded } from './ui';

export function StackPanel() {
  return (
    <>
      <Pill>AT THE WORKBENCH</Pill>
      <Title>The tools behind<br />the things.</Title>
      <p className={panelText}>A closer look at what’s on the desk.</p>
      {profile.stack.length ? (
        <div className="grid grid-cols-[1fr_1fr] gap-[9px] mt-[20px]">
          {profile.stack.map(item => (
            <div key={item.name} className="py-[16px] px-[12px] border border-line rounded-[7px] text-[12px]">
              {item.name}<span className="block text-[8px] text-muted mt-[6px]">{item.category}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <ProjectArt icon="monitor" label="YOUR TOOLKIT GOES HERE" />
          <Subtitle>A stack to make your own.</Subtitle>
          <p className={panelText}>Add your languages, frameworks, design tools, and infrastructure to fill this desk with your own toolkit.</p>
          <TemplateFields rows={toBeAdded('Languages', 'Frameworks', 'Design & tools')} />
        </>
      )}
    </>
  );
}
