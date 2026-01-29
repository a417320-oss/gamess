
import { useRef, useCallback, useEffect } from 'react';
import { GameStatus } from '../types';

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

/**
 * Hook for managing Game Audio
 * Handles WebAudio API context, Sound Effects, and Procedural Background Music
 * styled after 8-bit/16-bit Nintendo consoles (NES/SNES).
 */
export const useGameAudio = (isMusicOn: boolean, gameStatus: GameStatus) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicIntervalRef = useRef<number | null>(null);
  const sequencerStepRef = useRef<number>(0);

  // Initialize Audio Context (Requires user interaction first usually)
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  // Helper: Play a tone with envelope
  const playTone = useCallback((freq: number, type: OscillatorType, duration: number, vol: number = 0.1, time: number = 0) => {
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const t = time || ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
      
      osc.start(t);
      osc.stop(t + duration + 0.1);
  }, []);

  // Helper: Create Noise (Percussive/Explosions)
  const playNoise = useCallback((duration: number, vol: number = 0.1, highPass: boolean = false) => {
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const t = ctx.currentTime;
      
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = highPass ? 'highpass' : 'lowpass';
      filter.frequency.value = highPass ? 1000 : 800;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      noise.start(t);
  }, []);

  // Public Sound Effect Trigger
  const playSound = useCallback((type: 'shoot' | 'hit' | 'hurt' | 'explosion' | 'powerup' | 'win' | 'select' | 'ultimate' | 'shield_break' | 'ultimate_impact' | 'notification' | 'mission_success' | 'mission_fail' | 'deflect') => {
    // Master Mute Check
    if (!isMusicOn) return;
    
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    
    switch (type) {
        case 'select': 
            playTone(987.77, 'square', 0.1, 0.05, now); // B5
            playTone(1318.51, 'square', 0.2, 0.05, now + 0.05); // E6
            break;
        case 'shoot': 
            // Frequency sweep down
            {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            }
            break;
        case 'hit': 
            playNoise(0.05, 0.05, true);
            playTone(800, 'triangle', 0.05, 0.1);
            break;
        case 'deflect':
            // High pitched metallic ping
            playTone(1200, 'sine', 0.05, 0.1, now);
            playTone(1800, 'triangle', 0.03, 0.05, now);
            break;
        case 'hurt': 
            playNoise(0.1, 0.1);
            playTone(150, 'sawtooth', 0.1, 0.1);
            break;
        case 'shield_break': 
            playTone(800, 'sine', 0.1, 0.1, now);
            playTone(600, 'sine', 0.1, 0.1, now + 0.05);
            playNoise(0.2, 0.1, true);
            break;
        case 'explosion': 
            playNoise(0.4, 0.3, false);
            {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            }
            break;
        case 'powerup': 
            // Arpeggio
            playTone(440, 'square', 0.1, 0.05, now);       
            playTone(554.37, 'square', 0.1, 0.05, now + 0.08); 
            playTone(659.25, 'square', 0.1, 0.05, now + 0.16); 
            playTone(880, 'square', 0.3, 0.05, now + 0.24);    
            break;
        case 'notification':
            playTone(523.25, 'sine', 0.3, 0.1, now); 
            playTone(783.99, 'sine', 0.4, 0.1, now + 0.15); 
            break;
        case 'ultimate': 
            // Charging sound
            {
                 const osc = ctx.createOscillator();
                 const gain = ctx.createGain();
                 osc.connect(gain);
                 gain.connect(ctx.destination);
                 osc.type = 'triangle';
                 osc.frequency.setValueAtTime(220, now);
                 osc.frequency.linearRampToValueAtTime(880, now + 0.8);
                 const lfo = ctx.createOscillator(); // Tremolo
                 lfo.frequency.value = 15;
                 const lfoGain = ctx.createGain();
                 lfoGain.gain.value = 500;
                 lfo.connect(lfoGain);
                 gain.gain.setValueAtTime(0.05, now);
                 gain.gain.linearRampToValueAtTime(0.2, now + 0.8);
                 gain.gain.linearRampToValueAtTime(0, now + 1.0);
                 osc.start(now);
                 osc.stop(now + 1.0);
            }
            break;
        case 'ultimate_impact':
            playNoise(0.8, 0.4, false);
            playTone(50, 'sawtooth', 1.0, 0.3);
            break;
        case 'win': 
            [0, 0.15, 0.3, 0.45, 0.6, 0.9].forEach((t, i) => {
                const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50]; 
                playTone(notes[i], 'square', 0.2, 0.1, now + t);
            });
            break;
        case 'mission_success':
            // Uplifting Major Fanfare
            [0, 0.2, 0.4, 0.6, 0.8, 1.2, 1.6].forEach((t, i) => {
                const notes = [523.25, 523.25, 659.25, 783.99, 1046.50, 1318.51, 1046.50];
                playTone(notes[i], 'sawtooth', 0.3, 0.15, now + t);
            });
            break;
        case 'mission_fail':
            // Descending Minor
            [0, 0.3, 0.6, 0.9, 1.2].forEach((t, i) => {
                const notes = [440.00, 415.30, 392.00, 369.99, 100.00]; // A4, G#4, G4, F#4, Low Noise
                if (i < 4) playTone(notes[i], 'triangle', 0.4, 0.2, now + t);
                else playNoise(1.0, 0.3, false); // Thud
            });
            break;
    }
  }, [playTone, playNoise, isMusicOn]);

  // Procedural Music Sequencer
  useEffect(() => {
    const isMenu = gameStatus === GameStatus.MENU || gameStatus === GameStatus.CHARACTER_SELECT || gameStatus === GameStatus.GAME_OVER;
    const shouldPlay = isMusicOn && (isMenu || gameStatus === GameStatus.PLAYING);

    if (shouldPlay) {
      if (!musicIntervalRef.current) {
        
        // Note Frequencies
        const C3=130.81, D3=146.83, E3=164.81, F3=174.61, G3=196.00, A3=220.00, B3=246.94;
        const C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88;
        const C5=523.25, D5=587.33, E5=659.25, F5=698.46, G5=783.99;
        const Fs3=185.00, Fs4=369.99, Fs5=739.99, Cs5=554.37, Ds5=622.25, Ds4=311.13, Cs4=277.18;

        const menuSequence = [
            C4, E4, G4, C5, G4, E4, C4, E4,
            A3, C4, E4, A4, E4, C4, A3, C4,
            F3, A3, C4, F4, C4, A3, F3, A3,
            G3, B3, D4, G4, D4, B3, G3, B3
        ];

        const battleMelody = [
            E4, 0,  E4, 0,  G4, E4, 0,  D4,   C4, 0,  A3, 0,  0,  C4, D4, 0,
            E4, 0,  E4, 0,  G4, E4, 0,  B4,   A4, 0,  G4, 0,  E4, 0,  D4, E4,
            G4, E4, G4, A4, B4, 0,  A4, G4,   A4, G4, E4, D4, E4, 0,  0,  0,
            E4, 0,  B3, 0,  E4, 0,  G4, 0,    Fs4, 0, D4, 0,  B3, 0,  D4, 0,
            C4, C4, E4, G4, C5, 0,  B4, 0,    A4, 0,  G4, 0,  E4, 0,  D4, 0,
            D4, D4, Fs4, A4, D5, 0, Cs5, 0,   B4, 0,  A4, 0,  Fs4, 0, D4, 0,
            E4, 0,  G4, 0,  B4, 0,  E5, 0,    Ds5, 0, B4, 0,  Fs4, 0, Ds4, 0,
            E4, Fs4, G4, A4, B4, Cs5, Ds5, E5,Fs5, 0,  0,  0,  0,  0,  0,  0,
            E5, 0,  B4, 0,  G4, 0,  E4, 0,    D4, 0,  E4, 0,  G4, 0,  A4, 0,
            B4, 0,  G4, 0,  E5, 0,  D5, 0,    C5, B4, A4, G4, Fs4, G4, A4, 0,
            G4, Fs4, E4, D4, C4, B3, A3, G3,  Fs3, G3, A3, B3, C4, D4, E4, Fs4,
            G4, 0,  B4, 0,  E5, 0,  Fs5, 0,   G5, 0,  Fs5, 0, E5, 0,  Ds5, 0,
            E5, 0,  D5, 0,  C5, 0,  B4, 0,    A4, 0,  G4, 0,  Fs4, 0, E4, 0,
            D4, 0,  C4, 0,  B3, 0,  A3, 0,    G3, 0,  Fs3, 0, E3, 0,  D3, 0,
            C3, E3, G3, C4, E4, G4, C5, 0,    D3, Fs3, A3, D4, Fs4, A4, D5, 0,
            E3, G3, B3, E4, G4, B4, E5, 0,    E3, G3, B3, E4, G4, B4, E5, 0
        ];

        const battleBass = [
            E4/2, E4/2, E4/2, E4/2, E4/2, E4/2, E4/2, E4/2,  A3/2, A3/2, A3/2, A3/2, G3/2, G3/2, D4/2, D4/2,
            E4/2, E4/2, E4/2, E4/2, E4/2, E4/2, E4/2, E4/2,  A3/2, A3/2, C4/2, C4/2, B3/2, B3/2, E4/2, E4/2,
            E4/2, E4/2, G3/2, G3/2, A3/2, A3/2, B3/2, B3/2,  C4/2, C4/2, D4/2, D4/2, E4/2, E4/2, B3/2, B3/2,
            E4/2, 0,    0,    0,    E4/2, 0,    0,    0,     D4/2, 0,    0,    0,    D4/2, 0,    0,    0,
            C4/2, C4/2, C4/2, C4/2, C4/2, C4/2, C4/2, C4/2,  C4/2, C4/2, C4/2, C4/2, C4/2, C4/2, C4/2, C4/2,
            D4/2, D4/2, D4/2, D4/2, D4/2, D4/2, D4/2, D4/2,  D4/2, D4/2, D4/2, D4/2, D4/2, D4/2, D4/2, D4/2,
            E4/2, E4/2, E4/2, E4/2, E4/2, E4/2, E4/2, E4/2,  B3/2, B3/2, B3/2, B3/2, A3/2, A3/2, A3/2, A3/2,
            G3/2, G3/2, G3/2, G3/2, Fs3/2, Fs3/2, Fs3/2, Fs3/2, E3/2, 0,   0,   0,    0,   0,   0,   0,
            C4/2, C4/2, E4/2, E4/2, G4/2, G4/2, C5/2, C5/2,  B4/2, B4/2, G4/2, G4/2, E4/2, E4/2, C4/2, C4/2,
            D4/2, D4/2, Fs4/2, Fs4/2, A4/2, A4/2, D5/2, D5/2, Cs5/2, Cs5/2, A4/2, A4/2, Fs4/2, Fs4/2, D4/2, D4/2,
            E4/2, E4/2, G4/2, G4/2, B4/2, B4/2, E5/2, E5/2,  Ds5/2, Ds5/2, B4/2, B4/2, Fs4/2, Fs4/2, Ds4/2, Ds4/2,
            E4/2, E4/2, E4/2, E4/2, E4/2, E4/2, E4/2, E4/2,  D4/2, D4/2, D4/2, D4/2, D4/2, D4/2, D4/2, D4/2,
            C4/2, 0, C4/2, 0, E4/2, 0, G4/2, 0,   A3/2, 0, A3/2, 0, C4/2, 0, E4/2, 0,
            G3/2, 0, G3/2, 0, B3/2, 0, D4/2, 0,   F3/2, 0, F3/2, 0, A3/2, 0, C4/2, 0,
            E3/2, 0, 0, 0,    0, 0, 0, 0,         D3/2, 0, 0, 0,    0, 0, 0, 0,
            E3/2, 0, 0, 0,    0, 0, 0, 0,         E3/2, 0, 0, 0,    0, 0, 0, 0
        ];

        sequencerStepRef.current = 0;
        const intervalTime = (isMenu ? 320 : 220) * 2; 

        musicIntervalRef.current = window.setInterval(() => {
           if (!isMusicOn || !audioCtxRef.current) return;
           const step = sequencerStepRef.current;
           if (isMenu) {
               const loopLen = menuSequence.length;
               const note = menuSequence[step % loopLen];
               if (note) playTone(note, 'triangle', 0.3, 0.04);
               if (step % 8 === 0) {
                   let bassNote = C3;
                   const chordIdx = Math.floor((step % loopLen) / 8);
                   if (chordIdx === 1) bassNote = A3; 
                   if (chordIdx === 2) bassNote = F3; 
                   if (chordIdx === 3) bassNote = G3; 
                   playTone(bassNote, 'square', 0.5, 0.04);
               }
           } else {
               const loopLen = battleMelody.length;
               const currentStep = step % loopLen;
               const melNote = battleMelody[currentStep];
               if (melNote) playTone(melNote, 'square', 0.08, 0.05); 
               const bassNote = battleBass[currentStep];
               if (bassNote) playTone(bassNote, 'triangle', 0.1, 0.08);
               const beatPos = step % 4;
               if (beatPos === 0) playNoise(0.02, 0.1, false); 
               else if (beatPos === 2) playNoise(0.04, 0.05, true);
               if (currentStep % 32 === 0) playNoise(0.1, 0.1, false);
           }
           sequencerStepRef.current++;
        }, intervalTime);
      }
    } else {
      if (musicIntervalRef.current) {
        clearInterval(musicIntervalRef.current);
        musicIntervalRef.current = null;
      }
    }
    return () => {
      if (musicIntervalRef.current) clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
  }, [isMusicOn, gameStatus, playTone, playNoise]);

  return { initAudio, playSound };
};
