import { profile } from '../../data/profile';
import { safeURL } from '../../lib/safeUrl';
import { ProjectArt, Pill, Subtitle, TemplateFields, Title, panelButton, panelText, toBeAdded } from './ui';

export function ProjectsPanel({ index, onSelectDrawer }: { index: number; onSelectDrawer: (index: number) => void }) {
  const item = profile.projects[index];
  const ready = Boolean(item.title);
  const url = safeURL(item.url);
  const image = item.image && safeURL(item.image);
  return (
    <>
      <Title>Good things,<br />in the making.</Title>
      <p className={panelText}>A little collection of things built with care.<br />Pick a drawer and see what’s inside.</p>
      <div className="flex gap-[7px] mb-[18px]">
        {profile.projects.map((_, i) => (
          <button key={i} className={`py-[8px] px-[12px] border rounded-[5px] text-[10px] ${i === index ? 'bg-ink text-surface border-ink' : 'border-line'}`} aria-pressed={i === index} onClick={() => onSelectDrawer(i)}>
            Drawer 0{i + 1}
          </button>
        ))}
      </div>
      {image
        ? <ProjectArt><img className="w-full h-full object-cover rounded-[8px]" src={image} alt={item.title} /></ProjectArt>
        : <ProjectArt icon="folder" label={ready ? `PROJECT 0${index + 1}` : 'A BLANK CANVAS'} />}
      <Pill>{ready ? `PROJECT 0${index + 1}` : 'EMPTY PROJECT TEMPLATE'}</Pill>
      <Subtitle>{item.title || 'Your next great project'}</Subtitle>
      <p className={panelText}>{item.description || 'A space for a project you’re proud of. The story, the process, and the finished thing will live here.'}</p>
      {ready ? (
        <>
          <TemplateFields rows={[['Made with', item.tags.join(' · ') || '—']]} />
          {url && <p><a className={panelButton} href={url} target="_blank" rel="noopener noreferrer">Explore project ↗</a></p>}
        </>
      ) : <TemplateFields rows={toBeAdded('Project name', 'Tools & technologies', 'Live link / repository')} />}
    </>
  );
}
