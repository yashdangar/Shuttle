@convex/schema.ts:23-26 @convex/schema.ts:171-172 @hooks/maps @types/maps.ts 

This is one use case code for this maps things @components/interfaces/superadmin/locations/add-location-form.tsx 

now what we have to do is driver will move accroos the city and we have to live track his location along with ETA , now calc of ETA will be done with a algorithm that i wil tell you downsdie but now let say we have live location and ETA then we have to show them too in UI 

now live locqtion will be pseudo live , we will fetch location and ETA every 2 mins and this "2" should be mention in a file in constant.ts in lib folder , so I should be able to chnage it anytime , anf ofc it should be in seconds not mins 

so basiaclly we will fetch after every 2 min and all this logic of live tracking and making mutation in DB should be done from frontend only 

so when driver logs in then we will use that code which runs every 2 min which updates driver's location 

and in user side it will automatixally chnage as we are using convex db so we dont have to fetch / make extra query every 2 min , it will make sure to get updates data , we have to use the updated DATA and show the drivers location in frontend in googlemap that is our job

sp flow is when drover comes and takes a shuttle then we will start fetching his location and the person / guest will see that drivers locationin google map live changing as per data in DB, ofc driver will also see his own location too 

now driver will also see the overall path which he is goign to take in google maps according to priority , lower the priority means he will take that route first , priority will be set from frontend by driver only , we dont have that code so we have to do that priority thing too 

now right now we hve @components/interfaces/driver/shuttle-selection.tsx @app/(dashboards)/driver/page.tsx where he will select the shuttle ,once he does this he will go to this page @app/(dashboards)/driver/trips/page.tsx here he will see each of the trips of thatparticular day @convex/tripInstances/queries.ts:9-40 

now we have to chnage the UI where driover can set priority to all the tripInstaces for that particular hour , now let say driver have 7 tripinstaces we wll show all 7 of them , now driver can select first 4 which would be in this particular hour in frontend side not in backend side , now te tripInstace which are not of this particular hour should be grayed out so driver cannot give them priority ( but still he can if he uncheck or check a checkbox on top which allows him just in case ) now he will give prioritu in UI to each tripInstane 

first -> 1 then second selected as 2 and so on till4 let say , we will changes / put maje a api which changes / adds a priority to a specific tripInstace and ofc all the validaions we will put 

now once we put allthe priority then we will calc ETA as , bus driver's location to dest of tripInstace of this list with lowest priority , and put the ETA in that one tripInstace and now we will onlt calc ETA of dest of tripInstace with lowest to second lowest prioryt source and so on , so it will make a directed graph kinda thing where first node will only be the driver slocation ad every other node will be static locations from the @convex/schema.ts:146-170 

so i thnk now you know what to do 


first we have to make a UI where user can see the MAP and the drivers location live ( pseudo live ) and can see the ETA , 

then we have to make a recat code ( prefrably hook ) where. it sends data of current location to backend every 2 min 

Then we have to make frontend where driver caan set priority (ofc can chnage too ) for this current hour , and he can change for future too , and priorty will always start with 1 , so if let say any one of the rtripInstace id complteed then next time then we wll chnage the prioity of remainig and make the second guy first ( this will happen when the tripInstace end from the driver side ) , means he click this @components/interfaces/driver/trip-instance-detail.tsx:293-313 any on. of the button 

then we will give a map to driver too which will show all the location means dest one by one for each tripInstace in one map out side , and there will be one map inside trip/id page to see that specific trip route @app/(dashboards)/driver/trips/[id]/page.tsx @app/(dashboards)/driver/trips/page.tsx 

I need a detailed plan of what what to be done for this , and all should ahppen in proprt line 

