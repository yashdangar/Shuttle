# Google Maps Setup for Driver App

## Quick Setup

1. **Create `.env.local` file** in the driver directory:
```bash
# Create the file
echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here" > .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" >> .env.local
```

2. **Get a Google Maps API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable these APIs:
     - Maps JavaScript API
     - Directions API
     - Distance Matrix API
     - Geocoding API
   - Create credentials (API Key)
   - Replace `your_api_key_here` in `.env.local`

3. **Restart the development server:**
```bash
npm run dev
```

## Troubleshooting

If you see "maps is not defined" error:
- Check that `.env.local` file exists
- Verify API key is correct
- Ensure APIs are enabled in Google Cloud Console
- Check browser console for detailed error messages

## Test the Setup

1. Start the driver app: `npm run dev`
2. Navigate to the current trip page
3. You should see a Google Map with markers
4. Check browser console for "Google Maps API Status" log 