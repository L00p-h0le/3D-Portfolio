// Just the slice of the YouTube IFrame Player API this site uses.
declare namespace YT {
  interface VideoData { video_id: string; title: string; author: string }
  interface PlayerEvent<T = unknown> { target: Player; data: T }
  interface PlayerOptions {
    width?: number | string;
    height?: number | string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: (e: PlayerEvent) => void;
      onStateChange?: (e: PlayerEvent<number>) => void;
      onError?: (e: PlayerEvent<number>) => void;
    };
  }
  class Player {
    constructor(el: HTMLElement | string, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    nextVideo(): void;
    previousVideo(): void;
    playVideoAt(index: number): void;
    setVolume(volume: number): void;
    setShuffle(shuffle: boolean): void;
    getPlaylist(): string[] | null;
    getPlaylistIndex(): number;
    getVideoData(): VideoData;
    getCurrentTime(): number;
    getDuration(): number;
    getIframe(): HTMLIFrameElement;
  }
}

interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
