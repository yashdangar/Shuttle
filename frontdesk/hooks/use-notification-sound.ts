import { useCallback, useRef, useEffect } from 'react';

export const useNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasUserInteracted = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context and preload audio on mount
  useEffect(() => {
    // Create audio element and preload it
    if (!audioRef.current) {
      audioRef.current = new Audio('/tone.mp3');
      audioRef.current.volume = 0.5;
      audioRef.current.preload = 'auto';
      audioRef.current.loop = true;
      
      // Try to load the audio immediately
      audioRef.current.load();
    }

    // Create audio context for fallback method
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.log('AudioContext not supported:', error);
      }
    }

    // Mark user interaction on any user action
    const handleUserInteraction = () => {
      hasUserInteracted.current = true;
      console.log('User interaction detected, audio enabled');
      
      // Resume audio context if suspended
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });
    document.addEventListener('mousedown', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('mousedown', handleUserInteraction);
      
      // Cleanup audio resources
      if (audioRef.current) {
        audioRef.current.pause();
        if ((audioRef.current as any).beepInterval) {
          clearInterval((audioRef.current as any).beepInterval);
        }
      }
    };
  }, []);

  // Function to mark that user has interacted with the page
  const markUserInteraction = useCallback(() => {
    hasUserInteracted.current = true;
    console.log('User interaction marked manually');
    
    // Resume audio context if suspended
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const playContinuousNotificationSound = useCallback(async () => {
    console.log('Playing continuous notification sound...');
    
    // Check if sound is enabled in user preferences
    const soundEnabled = localStorage.getItem("frontdesk-sound-enabled");
    console.log('Sound enabled:', soundEnabled);
    
    if (soundEnabled === "false") {
      console.log('Sound is disabled, not playing');
      return; // Don't play sound if disabled
    }

    // Try multiple approaches to play sound
    let soundPlayed = false;

    // Method 1: Try using the preloaded audio element for continuous loop
    if (audioRef.current) {
      try {
        console.log('Trying preloaded audio element for continuous loop...');
        audioRef.current.currentTime = 0;
        audioRef.current.loop = true;
        
        // Try to play - this might work even without user interaction if audio is preloaded
        await audioRef.current.play();
        console.log('Audio element started successfully for continuous loop');
        soundPlayed = true;
      } catch (error) {
        console.log('Audio element failed:', error);
      }
    }

    // Method 2: If audio element failed and user has interacted, try again
    if (!soundPlayed && hasUserInteracted.current && audioRef.current) {
      try {
        console.log('Retrying audio element after user interaction...');
        await audioRef.current.play();
        console.log('Audio element started successfully on retry');
        soundPlayed = true;
      } catch (error) {
        console.log('Audio element retry failed:', error);
      }
    }

    // Method 3: Fallback to AudioContext for continuous beeping
    if (!soundPlayed && audioContextRef.current) {
      try {
        console.log('Trying AudioContext fallback for continuous beeping...');
        
        // Resume audio context if suspended
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        // Create continuous beeping using setInterval
        const beepInterval = setInterval(() => {
          try {
            const oscillator = audioContextRef.current!.createOscillator();
            const gainNode = audioContextRef.current!.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContextRef.current!.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContextRef.current!.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContextRef.current!.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current!.currentTime + 0.5);
            
            oscillator.start(audioContextRef.current!.currentTime);
            oscillator.stop(audioContextRef.current!.currentTime + 0.5);
          } catch (error) {
            console.log('AudioContext beep failed:', error);
            clearInterval(beepInterval);
          }
        }, 1000); // Beep every second

        // Store the interval ID so we can clear it when stopping
        (audioRef.current as any).beepInterval = beepInterval;
        
        console.log('AudioContext continuous beeping started successfully');
        soundPlayed = true;
      } catch (error) {
        console.log('AudioContext fallback failed:', error);
      }
    }

    if (!soundPlayed) {
      console.log('All audio methods failed, no sound will be played');
    }
  }, []);

  const stopNotificationSound = useCallback(() => {
    console.log('Stopping notification sound...');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
      
      // Clear the beep interval if it exists
      if ((audioRef.current as any).beepInterval) {
        clearInterval((audioRef.current as any).beepInterval);
        (audioRef.current as any).beepInterval = null;
        console.log('Beep interval cleared');
      }
      
      console.log('Sound stopped');
    }
  }, []);

  return {
    playContinuousNotificationSound,
    stopNotificationSound,
    markUserInteraction,
  };
}; 