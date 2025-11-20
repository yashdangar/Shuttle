TODO:

1. List required Google APIs for Maps + Autocomplete flow.
2. Describe how to enable each API and ensure billing is active.
3. Outline steps to create/rotate a Maps API key and wire it into `.env`.

Summary:

- **APIs to enable:** `Maps JavaScript API`, `Places API`, `Places API (New)`, `Geocoding API`, `Routes API` (optional but useful if you add directions), and `Geolocation API` if you ever call server-side location lookups. All require billing.
- **Enable + billing steps:** In Google Cloud Console → pick the correct project → `Billing` → link a billing account (or create one) so the project is “Billing enabled.” Then go to `APIs & Services` → `Library`, search each API above, open it, click `Enable`. Repeat for every required API; the console shows “API Enabled” once active.
- **Create/rotate API key:** `APIs & Services` → `Credentials` → `Create credentials` → `API key`. Copy the value, restrict it immediately: set `Application restrictions` to `HTTP referrers` and add your dev/prod domains. Under `API restrictions`, choose “Restrict key” and select the enabled APIs. Save, then update `.env.local` with `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key`, restart `next dev`, and redeploy any environments that read the env var.
