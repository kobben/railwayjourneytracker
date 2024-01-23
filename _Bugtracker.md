## Railway Journey Tracker
# Bugs tracker:

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

- [ ] [13/01/24] Mouseover highlight of journeys in Legs table (like in `showjourneys.js`).
- [x] [16/12/23] When selecting stop in pull-down, zoom to it => done [18/12/23].
- [ ] [06/12/23] Enable database search by bbox (current window or box drawn).
- [x] [01/12/23] move 'collect legs into journey' to `showlegs.js`. => done [16/12/23].
- [x] [17/10/23] add 'km' field to searchLeg Form. => done [12/11/23].
