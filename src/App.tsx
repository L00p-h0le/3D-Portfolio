import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { profile } from './data/profile';
import { MusicPlayer } from './lib/music';
import { Room, type PanelType, type RoomAction } from './lib/room';
import { storage } from './lib/storage';
import { Header } from './components/Header';
import { Intro } from './components/Intro';
import { RoomStage } from './components/RoomStage';
import { MiniPlayer } from './components/MiniPlayer';
import { RoomDock } from './components/RoomDock';
import { ExploreHint } from './components/ExploreHint';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { DetailDialog } from './components/DetailDialog';
import { ProjectsPanel } from './components/panels/ProjectsPanel';
import { StackPanel } from './components/panels/StackPanel';
import { AboutPanel } from './components/panels/AboutPanel';
import { WardrobePanel } from './components/panels/WardrobePanel';
import { MusicPanel } from './components/panels/MusicPanel';
import { ContactPanel } from './components/panels/ContactPanel';

type Action = RoomAction | PanelType;

const locations: Record<PanelType, string> = { projects:'THE PROJECT DRAWERS', stack:'THE DESKTOP', about:'THE PERSON', music:'THE MUSIC CORNER', wardrobe:'THE CLOSET', contact:'SAY HELLO' };
const descriptions: Record<Exclude<PanelType, 'contact'>, string> = { projects:'Getting a project from the drawers…', stack:'Taking a closer look at the desk…', about:'A little hello from the desk.', music:'Heading over to the record player…', wardrobe:'Finding something to wear…' };
const shortcuts: Record<string, PanelType> = { '1':'projects', '2':'stack', '3':'about', '4':'music', '5':'wardrobe' };
const restingStatus = (night: boolean) => night ? 'Lights low. Ideas still on.' : 'At the desk, making things.';
const formatTime = () => new Intl.DateTimeFormat('en', { hour:'2-digit', minute:'2-digit' }).format(new Date()).toUpperCase() + ' LOCAL';

export function App() {
  const [player] = useState(() => {
    const p = new MusicPlayer();
    const saved = Number(storage.get('inside-volume') ?? .35);
    p.setVolume(Number.isFinite(saved) ? Math.max(0, Math.min(1, saved)) : .35);
    return p;
  });
  useSyncExternalStore(player.subscribe, player.getSnapshot);

  const [night, setNight] = useState(() => storage.get('inside-theme') === 'night');
  const [outfitDay, setOutfitDay] = useState(() => new Date().getDay());
  const [openPanel, setOpenPanel] = useState<PanelType | null>(null);
  const [shownPanel, setShownPanel] = useState<PanelType>('projects');
  const [projectIndex, setProjectIndex] = useState(0);
  const [status, setStatus] = useState(() => restingStatus(night));
  const [toastState, setToastState] = useState({ message: '', visible: false });
  const [labelsHidden, setLabelsHidden] = useState(false);
  const [loading, setLoading] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [localTime, setLocalTime] = useState(formatTime);

  const busy = useRef(false);
  const audioBusy = useRef(false);
  const outfitPreview = useRef(false);
  const roomRef = useRef<Room | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<HTMLElement[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const toast = useCallback((message: string) => {
    setToastState({ message, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState(s => ({ ...s, visible: false })), 3200);
  }, []);
  useEffect(() => { player.onError = toast; }, [player, toast]);

  const audioAction = async (fn: () => Promise<void> | void) => {
    if (audioBusy.current) return;
    audioBusy.current = true;
    try { await fn(); } catch (error) { player.pause(); toast((error as Error).message || 'Audio could not play in this browser.'); } finally { audioBusy.current = false; }
  };

  const showPanel = (type: PanelType) => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setShownPanel(type); setOpenPanel(type);
  };

  const action = async (type: Action, index = 0) => {
    if (busy.current) { toast('One moment — just getting there.'); return; }
    const room = roomRef.current;
    if (type === 'ac') { const on = room?.toggleAC(); toast(on ? 'A little breeze. AC is on.' : 'Quiet room. AC is off.'); return; }
    if (type === 'bed') { toast('A reminder to rest. Good ideas need a little sleep, too.'); return; }
    busy.current = true;
    try {
      if (type === 'curtains') {
        setStatus(night ? 'Opening the curtains…' : 'Closing the curtains…');
        await room?.visit('curtains');
        const next = !night; setNight(next); storage.set('inside-theme', next ? 'night' : 'day');
        await room?.setNight(next); await room?.home();
        setStatus(restingStatus(next));
        return;
      }
      if (type !== 'contact') { setStatus(descriptions[type]); await room?.visit(type, index); }
      if (type === 'projects') setProjectIndex(index);
      showPanel(type);
      setStatus(type === 'projects' ? `Drawer 0${index + 1} · room for something good.` : type === 'stack' ? 'A closer look at the workbench.' : 'Make yourself at home.');
    } catch (error) { console.error(error); toast('That interaction couldn’t finish. Try resetting the view.'); }
    finally { busy.current = false; }
  };
  // The room and global listeners outlive renders, so they call through this ref.
  const actionRef = useRef(action);
  actionRef.current = action;

  const resetView = async () => {
    if (busy.current) return;
    busy.current = true;
    try { await roomRef.current?.home(); setStatus('A fresh perspective.'); } finally { busy.current = false; }
  };

  const onDialogClosed = async () => {
    setOpenPanel(null); busy.current = true;
    setStatus('Back to the workbench…');
    try { await roomRef.current?.home(); } finally { busy.current = false; setStatus(restingStatus(night)); returnFocus.current?.focus(); }
  };

  const selectDrawer = async (i: number) => {
    if (busy.current) return;
    busy.current = true; setStatus(`Opening drawer 0${i + 1}…`);
    try { await roomRef.current?.openDrawer(i); setProjectIndex(i); setStatus(`Drawer 0${i + 1} · ${profile.projects[i].title || 'room for something good'}.`); } finally { busy.current = false; }
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    audioAction(() => player.upload(file));
    e.target.value = '';
  };

  useLayoutEffect(() => {
    document.body.classList.toggle('night', night);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', night ? '#202a28' : '#f3f1e9');
  }, [night]);
  useLayoutEffect(() => { document.body.classList.toggle('playing', player.playing); });

  useEffect(() => {
    if (!openPanel) return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus();
  }, [openPanel]);

  useEffect(() => { roomRef.current?.setOutfit(outfitDay); }, [outfitDay]);

  useEffect(() => {
    const id = setInterval(() => {
      setLocalTime(formatTime());
      if (!outfitPreview.current) setOutfitDay(new Date().getDay());
    }, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (dialogRef.current?.open || e.ctrlKey || e.altKey || e.metaKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const type = shortcuts[e.key];
      if (type) { e.preventDefault(); actionRef.current(type); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let room: Room;
    try {
      room = new Room(containerRef.current!, (type, index) => actionRef.current(type, index));
    } catch (error) {
      console.error('3D room unavailable:', error);
      setLoading('failed'); setStatus('The portfolio is still open. Choose a section below.');
      return;
    }
    room.setLabels(labelRefs.current);
    room.setOutfit(outfitDay);
    if (night) room.setNight(true, true);
    roomRef.current = room;
    const frame = requestAnimationFrame(() => setLoading('ready'));
    return () => { cancelAnimationFrame(frame); room.dispose(); roomRef.current = null; };
    // Mount once; later outfit/theme changes are pushed by their own handlers.
  }, []);

  const panelContent = () => {
    switch (shownPanel) {
      case 'projects': return <ProjectsPanel index={projectIndex} onSelectDrawer={selectDrawer} />;
      case 'stack': return <StackPanel />;
      case 'about': return <AboutPanel outfitDay={outfitDay} onWave={async () => { await roomRef.current?.wave(); toast('Hey there. Make yourself at home.'); }} onBack={() => dialogRef.current?.close()} />;
      case 'wardrobe': return <WardrobePanel outfitDay={outfitDay} onPick={day => { outfitPreview.current = true; setOutfitDay(day); }} onToday={() => { outfitPreview.current = false; setOutfitDay(new Date().getDay()); }} />;
      case 'music': return <MusicPanel player={player} audioAction={audioAction} onVolume={value => { player.setVolume(value); storage.set('inside-volume', player.volume); }} onChooseFile={() => fileRef.current?.click()} />;
      case 'contact': return <ContactPanel />;
    }
  };

  return (
    <>
      <Header night={night} onToggleNight={() => action('curtains')} onAction={type => action(type)} />
      <main className="h-[calc(100dvh-152px)] min-h-[600px] relative mobile:h-auto mobile:min-h-[900px] short:h-[calc(100dvh-123px)] short:min-h-[520px]">
        <Intro onExplore={() => action('projects')} />
        <RoomStage
          containerRef={containerRef}
          labelRefs={labelRefs}
          labelsHidden={labelsHidden}
          loading={loading}
          status={status}
          onHotspot={type => action(type)}
          onReset={resetView}
          onToggleLabels={() => setLabelsHidden(hidden => !hidden)}
        />
        <MiniPlayer player={player} onToggle={() => audioAction(() => player.toggle())} onOpen={() => action('music')} />
        <RoomDock active={openPanel} onAction={type => action(type)} />
        <ExploreHint />
      </main>
      <Footer localTime={localTime} outfitDay={outfitDay} />
      <DetailDialog
        dialogRef={dialogRef}
        closeRef={closeRef}
        location={locations[shownPanel]}
        isBusy={() => busy.current}
        onBusyClose={() => toast('Just finishing the animation…')}
        onClosed={onDialogClosed}
      >
        {panelContent()}
      </DetailDialog>
      <Toast message={toastState.message} visible={toastState.visible} />
      <input ref={fileRef} type="file" accept="audio/*" hidden onChange={onFile} />
    </>
  );
}
