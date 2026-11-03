import { tracks } from '../data/tracks';

export const CUSTOM_TRACK = 3;

export class MusicPlayer {
  index = 0;
  playing = false;
  volume = .35;
  customTitle = '';
  audio?: HTMLAudioElement;
  onError?: (message: string) => void;
  private step = 0;
  private nextAt = 0;
  private voices = new Set<OscillatorNode>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private context?: AudioContext;
  private gain?: GainNode;
  private delay?: DelayNode;
  private feedback?: GainNode;
  private fileUrl?: string;
  private listeners = new Set<() => void>();
  private version = 0;

  // useSyncExternalStore hooks: every state change bumps the version.
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.version;
  private onChange() { this.version++; this.listeners.forEach(l => l()); }

  async init(){
    if(!this.context){
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if(!AudioContextClass)throw new Error('This browser does not support generated audio. Try a local audio file.');
      this.context=new AudioContextClass();this.gain=this.context.createGain();this.gain.gain.value=this.volume*.35;this.gain.connect(this.context.destination);
      this.delay=this.context.createDelay(2);this.delay.delayTime.value=.46;this.feedback=this.context.createGain();this.feedback.gain.value=.23;this.delay.connect(this.feedback);this.feedback.connect(this.delay);this.delay.connect(this.gain);
    }
    await this.context.resume();
  }
  async play(){
    if(this.index===CUSTOM_TRACK&&this.audio){this.audio.volume=this.volume;await this.audio.play();}
    else {await this.init();this.nextAt=this.context!.currentTime+.03;this.schedule();this.timer=setInterval(()=>this.schedule(),150);}
    this.playing=true;this.onChange();
  }
  async toggle(){if(this.playing)this.pause();else await this.play();}
  pause(){
    if(this.timer)clearInterval(this.timer);this.timer=null;if(this.audio)this.audio.pause();
    for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();
    if(this.context)this.context.suspend();this.playing=false;this.onChange();
  }
  async select(index: number){this.pause();this.index=index;this.step=0;await this.play();}
  async next(direction=1){const count=this.audio?4:3;await this.select((this.index+direction+count)%count);}
  setVolume(value: number){this.volume=value;if(this.gain&&this.context)this.gain.gain.setTargetAtTime(value*.35,this.context.currentTime,.05);if(this.audio)this.audio.volume=value;this.onChange();}
  private schedule(){
    const track=tracks[this.index];const context=this.context;if(!track||!context)return;
    while(this.nextAt<context.currentTime+.4){
      const midi=track.notes[this.step%track.notes.length];this.note(midi,this.nextAt,2.6,.24);
      if(this.step%4===0)this.note(midi-12,this.nextAt,3.6,.25);
      if(this.step%2===0)this.note(midi+12,this.nextAt+.22,1.8,.06);
      this.step++;this.nextAt+=60/track.bpm*.75;
    }
  }
  private note(midi: number,time: number,duration: number,volume: number){
    const context=this.context!;
    const oscillator=context.createOscillator(),envelope=context.createGain();
    oscillator.type='sine';oscillator.frequency.value=440*Math.pow(2,(midi-69)/12);
    envelope.gain.setValueAtTime(0,time);envelope.gain.linearRampToValueAtTime(volume,time+.03);envelope.gain.exponentialRampToValueAtTime(.001,time+duration);
    oscillator.connect(envelope);envelope.connect(this.gain!);envelope.connect(this.delay!);oscillator.start(time);oscillator.stop(time+duration+.1);this.voices.add(oscillator);oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
  }
  async upload(file?: File){
    if(!file)return;if(file.size>100*1024*1024)throw new Error('Choose an audio file smaller than 100 MB.');
    this.pause();if(this.audio)this.audio.src='';if(this.fileUrl)URL.revokeObjectURL(this.fileUrl);
    this.fileUrl=URL.createObjectURL(file);this.audio=new Audio(this.fileUrl);this.audio.loop=true;this.customTitle=file.name.replace(/\.[^.]+$/,'');
    this.audio.addEventListener('error',()=>{this.pause();this.onError?.('This audio format could not be played. Try an MP3, WAV, or OGG file.');});
    this.index=CUSTOM_TRACK;this.step=0;await this.play();
  }
  get title(){return this.index===CUSTOM_TRACK?this.customTitle:tracks[this.index].title;}
}
