# Google Maps API Setup for Guest App

This guide will help you set up Google Maps API for the guest shuttle booking application.

## Prerequisites

1. A Google Cloud Platform account
2. A project with billing enabled
3. Google Maps JavaScript API enabled

## Step 1: Enable Google Maps APIs

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Enable the following APIs:
   - **Maps JavaScript API** - For displaying maps
   - **Directions API** - For route calculations
   - **Geocoding API** - For address lookups
   - **Places API** - For location search (optional)

## Step 2: Create API Key

1. In the Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy the generated API key

## Step 3: Restrict API Key (Recommended)

1. Click on the created API key to edit it
2. Under **Application restrictions**, select **HTTP referrers (web sites)**
3. Add your domain(s):
   - `http://localhost:3000/*` (for development)
   - `https://yourdomain.com/*` (for production)
4. Under **API restrictions**, select **Restrict key**
5. Select the APIs you enabled in Step 1
6. Click **Save**

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in the guest app root directory
2. Add your API key:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Step 5: Restart Development Server

After adding the environment variable, restart your development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

## Step 6: Verify Setup

1. Open the guest app in your browser
2. Navigate to a booking with an active trip
3. You should see the Google Maps component displaying:
   - Driver location (blue marker)
   - Pickup location (red marker)
   - Dropoff location (green marker)
   - Route path between locations

## Troubleshooting

### "Google Maps Error" Message
- Check that your API key is correctly set in `.env.local`
- Verify the API key has the correct permissions
- Ensure the Maps JavaScript API is enabled

### "Failed to load Google Maps API"
- Check browser console for specific error messages
- Verify your domain is in the allowed referrers list
- Ensure billing is enabled on your Google Cloud project

### Maps Not Loading
- Check that the environment variable is named exactly `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Restart the development server after adding the environment variable
- Clear browser cache and reload the page

## Cost Considerations

- Google Maps APIs have usage-based pricing
- For development and small-scale usage, costs are typically minimal
- Monitor usage in the Google Cloud Console
- Set up billing alerts to avoid unexpected charges

## Security Notes

- Never commit your API key to version control
- Use environment variables for all API keys
- Restrict your API key to specific domains and APIs
- Regularly rotate your API keys
- Monitor API usage for unusual activity 