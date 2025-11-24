Sun - mon -tue 

Dev :   timezone nu shit figure out 

yash : 
Location edit UI 
(FD+Admin) Trip table page + trip add page + trip edit page 

hard shit 
Guets ma Form ui change karvu padshe and make it working
Frontdesk ma booking list thai ee UI 
Booking / id walu page 
Trip Instance pan create thashe -> only for the firs booking of that time 

########
########
########
########
########
########
########
########
########
########
########
########


Roles : 
    Guest
    Admin
    Frontdesk
    Driver
    Superadmin

Frontends : ( 5 frontends for 5 people )
    Landing page : / 
    Login page : /sign-in ( All user can login from here , no matter which role are they having)
    SignUp page : /sign-up ( User signed up from here will always be guest)

Session info : 
    role 
    email 
    id 
    name 

Side-chick tables : 
    notifications
    OTP
    Logs ? ( may be add this table may be not ) (may be we use prisma for this dont add now )
    chat
    messages
    QR-verification-token 

Auth tables : 
    user ( dont need accoutn ,session tables as one session per user is enough for now ) here user can be admin , super-admin, frontdsk , driver or guest


Necessary things : isFree in trip 
Payment method : app , frontdesk , deposit 


Location -> 
    There will be some locations which superadmin will create and then admin of some hotel can choose locations where they operate + admin can add their private locations too which wont be public / global but will oly be there for their hotel .
    Also admin can chnage name of the lcoation for himself , means he might overwrite the name of the location , so we csn do one thing , we can make a copy of the location which the Admin selects with the name he wants , and links the location with hotel not superadmin 

    Also location fetching should work like -> get all locaiton foe a hotel id
    And there can be a null hotel id too 

    isAirportLocation bool ( they need sub-options ) ( have a logic for this in UI) +  dont know 

In booking we will have from and to location ID 
advance booking option should be there 

There should be a path selection rather then selecting a src and dest in users end (ASK NIRAV ABOUT THiS)

Path table ma timing hashe , means not all path will be available all the time 

Time zone should be there in Db only in hotel table only ( it will be very helpful for us to convert time )

booking modal -> relation with -> Trip modal ( trip will have 2 locations , one src and one destination )

Main modals : 
    Shuttle 
    User
    Trip 
    booking 
    driver-location
    hotel




booking ema trip select -> trip no trip time male ee j batava no and ema the ek trip time s,eect karshe user -> ee trip time par the shuttle id and driverid malshe -> and aa booking ne ek nava tripunstance sathe mukvano if ee triptime mate instance no hoi ee divase to , neter ee divas and ee time mate je tripinstance hoi tene id api devani booking ma 

now booking list ma trip time , trip instane dekhai 

driver ne tripinstance dekhad vana badha , adv booking pan and right now je chalu hoi te pan \





TODO:

1. List required Google APIs for Maps + Autocomplete flow.
2. Describe how to enable each API and ensure billing is active.
3. Outline steps to create/rotate a Maps API key and wire it into `.env`.

Summary:

- **APIs to enable:** `Maps JavaScript API`, `Places API`, `Places API (New)`, `Geocoding API`, `Routes API` (optional but useful if you add directions), and `Geolocation API` if you ever call server-side location lookups. All require billing.
- **Enable + billing steps:** In Google Cloud Console → pick the correct project → `Billing` → link a billing account (or create one) so the project is “Billing enabled.” Then go to `APIs & Services` → `Library`, search each API above, open it, click `Enable`. Repeat for every required API; the console shows “API Enabled” once active.
- **Create/rotate API key:** `APIs & Services` → `Credentials` → `Create credentials` → `API key`. Copy the value, restrict it immediately: set `Application restrictions` to `HTTP referrers` and add your dev/prod domains. Under `API restrictions`, choose “Restrict key” and select the enabled APIs. Save, then update `.env.local` with `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key`, restart `next dev`, and redeploy any environments that read the env var.
