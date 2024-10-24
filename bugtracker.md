## Railway Journey Tracker

# Bug tracker:


- [x] [18/10/24] KMs in Legs seems to be wrong? => calc in SQL trigger changed to `km = round(st_length(geom,true)/1000`
- [ ] [18/10/24] When canceling OSMquery, busy cursor remains active.
- [ ] [12/10/24] When gathering relation objects: "platform_entry_only" and "platform_exit_only" are not recognised.
- [x] [28/06/24] `Journeys > select in extent`: does not load legs of journeys that are IN extent, where the leg is OUT of extent. => added check and extra DB search if necessary in `loadJourneyLegsFromDB()` (in `Models.js`}
- [x] [14/06/24] After 'add stop from  OSM' and then Save, another `constructstops.js` is started. => replaced `windows.open()' with ` location.replace()'.
- [x] [20/05/24] Missing Cancel in manual merge in `constructlegs.js` => added Cancel button and code in `constructLineManually()`
- [x] [27/04/24] In DrawLeg blank page when choosing 'show existing legs' (OK when choosing 'skip') => APP.journeystops (unneeded here) actually failed before this; added test before attempting. 
- [x] [16/12/23] in `constructleg.js` manual merge: after 1st selection non-select colour turns to grey (should be blue) => in `Legs.selectOnMap(selected, mapLayer)` added test for "NewLegs" layer. 
- [x] [25/10/23] highlight legs in many cases unclear => highlight style (red) given high zIndex in OL styles def in `Map.js`.
- [x] [26/9/23] edit stops does not work at all (in showstops.js) => repaired erroneous JS call.
- [x] [1/9/23] choose stops menus should not justify ('fill out') in workflow pane (eg in contructlegs.js)
  => changed CSS style tableFixHead: deleted 'width: 100%'
- [x] [15/8/23] when going into manual construction from `constructlegs.js`: error message in console?   
  => cleaned up info & error messages.
- [x] [12/8/23] In `drawlegs.js` if linked to GetStop then no zoom to currentpos (as does happen  when coming from `showlegs`)   
  => added `openURLwithCurrentLocation(theURL)` in `Utils.js` and use this to get update location and open APP there.
  
# Feature requests:

- [ ] [07/09/24] Add travel time to legs output
- [x] [07/09/24] Add travel time to journeys output => done [07/09/24]
- [x] [18/05/24] 'busy' pointer while searching in DB (especially "legs in extent'] => done [29/07/24]
- [x] [27/04/24] Add cumulative km's to Journey tables => done [07/09/24]
- [x] [13/01/24] Mouseover popup of journey info in Legs table (like in `showjourneys.js`). => done [25/01/24]
- [x] [16/12/23] When selecting stop in pull-down, zoom to it => done [18/12/23].
- [x] [06/12/23] Enable database search by bbox (current map extent or box drawn) => done [21/02/24].
- [x] [01/12/23] move 'collect legs into journey' to `showlegs.js`. => done [16/12/23].
- [x] [17/10/23] add 'km' field to searchLeg Form. => done [12/11/23].
