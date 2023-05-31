## Railway Journey Tracker

©2023 Barend Köbben - <a href="mailto:b.j.kobben@utwente.nl">b.j.kobben@utwente.nl</a> 

This is a WebApp for keeping track of railway journeys. It lets you extract GeoJSON entities 
(Journey Stops and Legs) from OSM public transport data (and some other sources). 
It stores them in a DB (separately as **Legs**, i.e travelled lines, and their end and start **Stops**, i.e station points, and as **Journeys** which are a collection of Legs that together form a journey). It stores the data in a PostGreSQL DB, so is only needing OSM when creating new legs.
The PostGREST REST interface to the Postgres DB is used by this purely Javascript (ECMA 5 compliant) application running on any modern browser
(basically anything other then old Internet Explorer).

### [Code available on GitHub](https://github.com/kobben/railwayjourneytracker)

Licensed under GNU General Public License v3.0 (see https://choosealicense.com/licenses/gpl-3.0/)

SPDX-License-Identifier: GPL-3.0-only

#### Links to libraries and software used:
* OpenStreetMap Overpass API: https://wiki.openstreetmap.org/wiki/Overpass_API
* PostgreSQL database: https://www.postgresql.org
* PostGREST REST interface to DB (11.0.1): https://postgrest.org
* OpenLayers webmapping API (v7.2.2): https://openlayers.org 
* OpenLayers LayerSwitcher plugin: https://github.com/walkermatt/ol-layerswitcher/
* JSTS library (2.3.0) of spatial predicates and functions for processing geometry: https://github.com/bjornharrtell/jsts
* TURF (6.5.0), simple-to-understand JavaScript functions that speak GeoJSON: https://turfjs.org

#### Changelist:
    v1.0 May 2023 Extensive refactoring to:
      - move functionality of Stops, Legs, Journeys to model CLASSes
      - move all DB, UI, MAP and HTML functionality to their respective OBJECTs 
        in separate JS files
    v0.8 Dec 2022 
      - adding Journey support [several Legs forming 1 journey from 
        origin to destination]   
      - removed .name parameter from Legs object.
    v0.7 Aug 2022 
      - added import leg from geoJSON option
      - added filterLegs() to displayLegsInTable(): un/filter table on selection
      - moved ZoomTo button to table header
      - using encodeURIComponent(theCol) to provide for searches 
        with special characters (such as & + etc)
    v0.6 Mar 2022 
      - added choice to copy date&Time when editing Legs
      - now using createStopsOptions() in HTML forms
    v0.5 Jan 2022 
      - added TruncateLeg
      - all modules now start with loading legs step  
      - doConstructLeg now also finds tram, subway & ferry routes
      - added RefreshStops to dynamically change stops menus
      - added proper LayerSwitcher (using Matt Walker's code)
      - removed various bugs
    v0.4 Dec 2021 
      - added CreateLegManually (for handpicking OSM relation elements)
      - proper interface to select MultiLineString sections
      - added Leg.type, with appropriate pulldown menus
      - put the UI handling into classes of UI.js
      - removed various bugs
    v0.3 Oct 2021 - added copyLeg, ReturnOverLeg, MergeLegs
      - using Turf & JSTS libs for various spatial tasks 
        (eg. creating legs from MultiLineStrings)
    v0.2 Aug 2021 
      - removed various bugs
      - Added SearchLegs functionality
    v0.1 Aug 2021 - first version