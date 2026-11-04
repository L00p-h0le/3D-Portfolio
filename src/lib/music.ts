import { playlist } from '../data/profile';

// YT.PlayerState values.
const ENDED = 0, PLAYING = 1, PAUSED = 2, BUFFERING = 3;
// 100: removed or private, 101/150: the owner disabled embedding.
const UNPLAYABLE = new Set([100, 101, 150]);

let apiPromise: Promise<void> | undefined;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return apiPromise ??= new Promise<void>((resolve, reject) => {
    const fail = (message: string) => { clearTimeout(timer); apiPromise = undefined; reject(new Error(message)); };
    const timer = setTimeout(() => fail('YouTube took too long to answer.'), 10000);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timer); previous?.(); resolve(); };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => fail('YouTube is blocked on this network or by an extension.');
    document.head.appendChild(script);
  });
}

export interface TrackInfo { title: string; author: string }
export type PlayerStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

/** The record player: a YouTube playlist driven through the IFrame API, exposed as a tiny external store. */
export class MusicPlayer {
  index = 0;
  playing = false;
  /** True once anything has played; before that the UI invites a first play. */
  started = false;
  /** A play was asked for but YouTube hasn't produced sound yet (buffering, or blocked). */
  waiting = false;
  volume = .35;
  shuffle = false;
  status: PlayerStatus = 'idle';
  ids: string[] = [];
  onError?: (message: string) => void;
  private yt?: YT.Player;
  private ready?: Promise<void>;
  private info = new Map<string, TrackInfo>();
  private requested = new Set<string>();
  private skips = 0;
  private stallTimer?: ReturnType<typeof setTimeout>;
  private listeners = new Set<() => void>();
  private version = 0;

  // useSyncExternalStore hooks: every state change bumps the version.
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.version;
  private onChange() { this.version++; this.listeners.forEach(l => l()); }

  /** Create the YouTube player inside `el`. The element is replaced by the iframe, so pass one React doesn't own. */
  mount(el: HTMLElement) {
    if (this.ready) return this.ready;
    this.status = 'loading'; this.onChange();
    this.ready = loadApi()
      .then(() => new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('The YouTube player did not start.')), 15000);
        this.yt = new YT.Player(el, {
          width: 200, height: 200,
          playerVars: { listType: 'playlist', list: playlist.id, controls: 0, playsinline: 1, rel: 0, disablekb: 1, iv_load_policy: 3, fs: 0, origin: location.origin },
          events: {
            onReady: () => { clearTimeout(timer); this.yt!.setVolume(this.volume * 100); this.status = 'ready'; this.sync(); resolve(); },
            onStateChange: e => this.onState(e.data),
            onError: e => this.onPlayerError(e.data),
          },
        });
      }))
      .catch(() => { this.status = 'unavailable'; this.yt = undefined; this.onChange(); });
    return this.ready;
  }

  private async player() {
    await this.ready;
    if (!this.yt) throw new Error('Couldn’t reach YouTube. Open the playlist on YouTube Music instead.');
    return this.yt;
  }
  async play() { const yt = await this.player(); this.expectSound(); yt.playVideo(); }
  pause() { this.clearStall(); this.yt?.pauseVideo(); }
  async toggle() { if (this.playing) this.pause(); else await this.play(); }
  async select(index: number) { if (index === this.index && this.started) return this.toggle(); const yt = await this.player(); this.expectSound(); yt.playVideoAt(index); }
  async next(direction = 1) { const yt = await this.player(); this.expectSound(); if (direction > 0) yt.nextVideo(); else yt.previousVideo(); }
  async setShuffle(on: boolean) { const yt = await this.player(); yt.setShuffle(on); this.shuffle = on; this.sync(); }
  setVolume(value: number) { this.volume = value; this.yt?.setVolume(value * 100); this.onChange(); }

  /** Watch for a play request that never turns into sound, which is what an ad blocker or embed block looks like. */
  private expectSound() {
    this.clearStall(); this.waiting = true; this.onChange();
    this.stallTimer = setTimeout(() => {
      this.waiting = false; this.playing = false; this.onChange();
      this.onError?.('YouTube isn’t playing. An ad blocker or browser shield may be blocking it — try allowing this site.');
    }, 9000);
  }
  private clearStall() { clearTimeout(this.stallTimer); this.stallTimer = undefined; this.waiting = false; }

  private onState(state: number) {
    // Only real playback counts as playing, so the record never spins in silence.
    // UNSTARTED, CUED and BUFFERING fire between tracks and leave the current state alone.
    if (state === PLAYING) { this.clearStall(); this.playing = true; this.started = true; this.skips = 0; }
    else if (state === PAUSED || state === ENDED) { this.clearStall(); this.playing = false; }
    else if (state === BUFFERING && !this.waiting && !this.playing) this.waiting = true;
    this.sync();
  }
  private onPlayerError(code: number) {
    if (UNPLAYABLE.has(code) && this.skips < Math.max(3, this.ids.length)) {
      this.skips++;
      this.onError?.('Skipped a track that can’t play outside YouTube.');
      this.yt?.nextVideo();
      return;
    }
    this.playing = false; this.onChange();
    this.onError?.('That track couldn’t play here.');
  }
  private sync() {
    const yt = this.yt;
    if (yt) {
      this.ids = yt.getPlaylist() ?? this.ids;
      this.index = Math.max(0, yt.getPlaylistIndex());
      const data = yt.getVideoData();
      if (data?.video_id && data.title) this.info.set(data.video_id, { title: data.title, author: data.author });
    }
    this.onChange();
  }

  /** Title and channel for a video; fetched once through oEmbed (CORS-enabled) and cached. */
  track(id: string | undefined): TrackInfo | undefined {
    if (!id) return undefined;
    const known = this.info.get(id);
    if (known || this.requested.has(id)) return known;
    this.requested.add(id);
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { title: string; author_name: string }) => { this.info.set(id, { title: d.title, author: d.author_name }); this.onChange(); })
      .catch(() => {});
    return undefined;
  }
  get current() { return this.ids[this.index]; }
  get title() { return this.track(this.current)?.title ?? ''; }
  get author() { return this.track(this.current)?.author ?? ''; }
  /** 0–1 through the current track. */
  progress() { const d = this.yt?.getDuration() ?? 0; return d > 0 ? Math.min(1, (this.yt!.getCurrentTime() ?? 0) / d) : 0; }
  time() { return { now: this.yt?.getCurrentTime() ?? 0, total: this.yt?.getDuration() ?? 0 }; }
}

export const thumbnail = (id: string, quality: 'mqdefault' | 'hqdefault' | 'maxresdefault' = 'mqdefault') => `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
