import { profile } from '../../data/profile';
import { safeURL, validEmail } from '../../lib/safeUrl';
import { Pill, TemplateFields, Title, panelButton, panelText, toBeAdded } from './ui';

export function ContactPanel() {
  const email = profile.email && validEmail(profile.email);
  return (
    <>
      <Pill>THE DOOR IS OPEN</Pill>
      <Title>Good things start<br />with a hello.</Title>
      <p className={panelText}>{email ? 'Have a project in mind, an interesting idea, or just a good song? Let’s talk.' : 'A place for future conversations. Contact details and social links will be added here.'}</p>
      {email
        ? <a className={panelButton} href={`mailto:${email}`}>{email} ↗</a>
        : <TemplateFields rows={toBeAdded('Email', 'Social links')} />}
      {profile.links.filter(l => safeURL(l.url)).map(l => (
        <p key={l.url}><a href={safeURL(l.url)} target="_blank" rel="noopener noreferrer">{l.label} ↗</a></p>
      ))}
    </>
  );
}
