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

