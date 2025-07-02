# Notification Sounds Feature

## Overview
The frontdesk application now includes sound notifications that play when new notifications arrive via WebSocket.

## Features

### Sound Notifications
- **Automatic Sound**: Plays a beep sound when new notifications arrive
- **Sound Types**: 
  - New booking notifications
  - Booking update notifications  
  - Driver update notifications
  - Shuttle update notifications

### User Controls
- **Enable/Disable**: Users can toggle sound notifications on/off
- **Quick Toggle**: Sound toggle button in the notification drawer
- **Settings Page**: Full sound settings in the profile page
- **Persistent Settings**: Sound preferences are saved in localStorage

## Implementation Details

### Files Modified/Created
1. `hooks/use-notification-sound.ts` - Sound management hook
2. `components/sound-settings.tsx` - Sound settings UI component
3. `context/WebSocketContext.tsx` - Added sound triggers to WebSocket events
4. `components/notification-drawer.tsx` - Added quick sound toggle
5. `app/dashboard/profile/page.tsx` - Added sound settings to profile page

### Sound Technology
- **Primary**: Web Audio API for generating beep sounds
- **Fallback**: Audio element for MP3 files (if provided)
- **Frequency**: 800Hz sine wave
- **Duration**: 300ms
- **Volume**: 30% of maximum

### User Experience
- **Non-intrusive**: Short, pleasant beep sound
- **Accessible**: Easy to enable/disable
- **Responsive**: Immediate sound feedback for notifications
- **Customizable**: Users can control their sound preferences

## Usage

### For Users
1. **Enable/Disable Sound**: 
   - Quick toggle in notification drawer (volume icon)
   - Full settings in Profile → Notification Settings
2. **Test Sound**: Use the "Test Sound" button in settings
3. **Persistent**: Settings are automatically saved

### For Developers
1. **Adding New Sound Events**: Modify `WebSocketContext.tsx` to add `playNotificationSound()` calls
2. **Customizing Sound**: Modify `use-notification-sound.ts` hook
3. **Sound File**: Add MP3 file to `public/` directory for custom sounds

## Browser Compatibility
- **Modern Browsers**: Full support with Web Audio API
- **Fallback**: Graceful degradation if audio features unavailable
- **Mobile**: Works on mobile browsers with audio permissions

## Future Enhancements
- Different sounds for different notification types
- Volume control slider
- Custom sound file upload
- Sound scheduling (quiet hours) 