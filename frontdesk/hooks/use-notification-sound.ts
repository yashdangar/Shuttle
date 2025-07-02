import { useCallback, useRef } from 'react';

export const useNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);



  const playContinuousNotificationSound = useCallback(async () => {
    console.log('Playing continuous notification sound...');
    
    // Check if sound is enabled in user preferences
    const soundEnabled = localStorage.getItem("frontdesk-sound-enabled");
    console.log('Sound enabled:', soundEnabled);
    
    if (soundEnabled === "false") {
      console.log('Sound is disabled, not playing');
      return; // Don't play sound if disabled
    }
    
    // Try to use the MP3 file
    try {
      console.log('Trying MP3 file...');
      if (!audioRef.current) {
        audioRef.current = new Audio('/tone.mp3');
        audioRef.current.volume = 0.5;
        audioRef.current.preload = 'auto';
      }
      audioRef.current.currentTime = 0;
      audioRef.current.loop = true;
      
      // Try to play - this might fail due to autoplay policy
      await audioRef.current.play();
      console.log('MP3 started successfully');
    } catch (error) {
      console.error('MP3 failed:', error);
      console.log('No sound will be played due to browser restrictions');
    }
  }, []);

  const stopNotificationSound = useCallback(() => {
    console.log('Stopping notification sound...');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
      console.log('Sound stopped');
    }
  }, []);

  return {
    playContinuousNotificationSound,
    stopNotificationSound,
  };
}; 