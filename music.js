// Small original generative compositions: no streaming account or remote audio required.
export const tracks = [
  { title:'Window seat', subtitle:'Soft keys · a slow afternoon', bpm:68, notes:[48,55,60,64,47,54,59,62,45,52,57,60,43,50,55,59] },
  { title:'After hours', subtitle:'Warm tones · lights down low', bpm:58, notes:[45,52,59,60,41,48,55,57,48,55,62,64,43,50,57,59] },
  { title:'Sunday, slowly', subtitle:'Gentle bells · nowhere to be', bpm:76, notes:[53,60,65,69,48,55,60,64,50,57,62,65,46,53,58,62] },
];
export class MusicPlayer {
  constructor(onChange) { this.onChange=onChange;this.index=0;this.playing=false;this.volume=.35;this.step=0;this.voices=new Set(); }
  async init(){
    if(!this.context){
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)throw new Error('This browser does not support generated audio. Try a local audio file.');
      this.context=new AudioContext();this.gain=this.context.createGain();this.gain.gain.value=this.volume*.35;this.gain.connect(this.context.destination);
      this.delay=this.context.createDelay(2);this.delay.delayTime.value=.46;this.feedback=this.context.createGain();this.feedback.gain.value=.23;this.delay.connect(this.feedback);this.feedback.connect(this.delay);this.delay.connect(this.gain);
    }
    await this.context.resume();
  }
  async play(){
    if(this.index===3&&this.audio){this.audio.volume=this.volume;await this.audio.play();}
    else {await this.init();this.nextAt=this.context.currentTime+.03;this.schedule();this.timer=setInterval(()=>this.schedule(),150);}
    this.playing=true;this.onChange();
  }
  async toggle(){if(this.playing)this.pause();else await this.play();}
  pause(){
    clearInterval(this.timer);this.timer=null;if(this.audio)this.audio.pause();
    for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();
    if(this.context)this.context.suspend();this.playing=false;this.onChange();
  }
  async select(index){this.pause();this.index=index;this.step=0;await this.play();}
  async next(direction=1){const count=this.audio?4:3;await this.select((this.index+direction+count)%count);}
  setVolume(value){this.volume=value;if(this.gain)this.gain.gain.setTargetAtTime(value*.35,this.context.currentTime,.05);if(this.audio)this.audio.volume=value;}
  schedule(){
    const track=tracks[this.index];if(!track)return;
    while(this.nextAt<this.context.currentTime+.4){
      const midi=track.notes[this.step%track.notes.length];this.note(midi,this.nextAt,2.6,.24);
      if(this.step%4===0)this.note(midi-12,this.nextAt,3.6,.25);
      if(this.step%2===0)this.note(midi+12,this.nextAt+.22,1.8,.06);
      this.step++;this.nextAt+=60/track.bpm*.75;
    }
  }
  note(midi,time,duration,volume){
    const oscillator=this.context.createOscillator(),envelope=this.context.createGain();
    oscillator.type='sine';oscillator.frequency.value=440*Math.pow(2,(midi-69)/12);
    envelope.gain.setValueAtTime(0,time);envelope.gain.linearRampToValueAtTime(volume,time+.03);envelope.gain.exponentialRampToValueAtTime(.001,time+duration);
    oscillator.connect(envelope);envelope.connect(this.gain);envelope.connect(this.delay);oscillator.start(time);oscillator.stop(time+duration+.1);this.voices.add(oscillator);oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
  }
  async upload(file){
    if(!file)return;if(file.size>100*1024*1024)throw new Error('Choose an audio file smaller than 100 MB.');
    this.pause();if(this.audio)this.audio.src='';if(this.fileUrl)URL.revokeObjectURL(this.fileUrl);
    this.fileUrl=URL.createObjectURL(file);this.audio=new Audio(this.fileUrl);this.audio.loop=true;this.customTitle=file.name.replace(/\.[^.]+$/,'');
    this.audio.addEventListener('error',()=>{this.pause();this.onError?.('This audio format could not be played. Try an MP3, WAV, or OGG file.');});
    this.index=3;this.step=0;await this.play();
  }
  get title(){return this.index===3?this.customTitle:tracks[this.index].title;}
}
