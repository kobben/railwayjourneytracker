## Railway Journey Tracker

©2022-24 Barend Köbben - <a href="mailto:b.j.kobben@utwente.nl">b.j.kobben@utwente.nl</a> 

This is a WebApp for keeping track of railway journeys. It lets you extract GeoJSON entities 
(Journey Stops and Legs) from OSM public transport data (and some other sources). 
It stores them in a DB (separately as **Legs**, i.e travelled lines, and their end and start **Stops**, i.e station points, and as **Journeys** which are a collection of Legs that together form a journey). It stores the data in a PostGreSQL DB, so is only needing OSM connection when creating legs and stops from the OSM DB.
The PostGREST REST interface to the Postgres DB is used by this purely Javascript (ECMA 5 compliant) application running on any modern browser (basically anything other then old Internet Explorer).

### [Code available on Gitlab](https://gitlab.utwente.nl/kobben/railwayjourneytracker)

Licensed under GNU General Public License v3.0 (see https://choosealicense.com/licenses/gpl-3.0/)

SPDX-License-Identifier: GPL-3.0-only

#### Services that this software needs to connect to:
* OpenStreetMap, through the Overpass API: https://wiki.openstreetmap.org/wiki/Overpass_API
* PostgreSQL database: https://www.postgresql.org
* PostGREST REST interface to DB (12.0.2): https://postgrest.org
#### JS Libraries used:
* OpenStreetMap Overpass API: https://wiki.openstreetmap.org/wiki/Overpass_API
* PostGREST client lib (1.2.2): https://github.com/calebmer/postgrest-client
* OpenLayers webmapping API (v7.2.2): https://openlayers.org 
* OpenLayers LayerSwitcher plugin (4.1.1) : https://github.com/walkermatt/ol-layerswitcher/
* JSTS library (2.3.0) of spatial predicates and functions for processing geometry: https://github.com/bjornharrtell/jsts
* TURF (6.5.0), simple-to-understand JavaScript functions that speak GeoJSON: https://turfjs.org

#### Changelist:
    v1.4 Oct 2024
        - added several features (see bugtracker.md for details)
        - removed several bugs (see bugtracker.md for details)
    v1.3 Feb 2024
        - removed several bugs (see bugtracker.md)
        - added mouseover popup of journey info in Legs table
        - added zooming to stop selected in pull-down menu
        - enabled database search by bbox (current window)
    v1.2 Dec 2023
       - in `truncateLeg`, selecting stop in pull-down zooms to it.
       - moved 'collect legs into journey' to `showlegs.js`.
    v1.1 Oct 2023
      - added km column to legs table and Model.
      - created TRIGGERs in DB to automatically calculate stops.geom, legs.geom & legs.
        km when needed.
    v1.0 May 2023 
      Extensive refactoring to:
      - move functionality to Models.js: CLASSes Stop, StopsCollection, Leg, LegsCollection,
        Journey, JourneysCollection and OSMrelation 
      - move all DB, UI, MAP and HTML functionality to their respective OBJECTs 
        in separate JS files
    v0.8 Apr 2023
      - adding Journey support [several Legs forming 1 journey from 
        origin to destination]   
      - removed name parameter from Legs object.
    v0.7 Mar 2023 
      - added importLeg from geoJSON option
      - added filterLegs() to displayLegsInTable(): un/filter table on selection
      - moved ZoomTo button to table header
      - using encodeURIComponent(theCol) to provide for searches 
        with special characters (such as & + etc)
    v0.6 Mar 2022 
      - added choice to copy date&Time when editing Legs
      - now using createStopsOptions() in HTML forms
    v0.5 Feb 2023 
      - added TruncateLeg
      - all modules now start with loading legs step (if relevant) 
      - doConstructLeg now also finds lightrail & ferry routes
      - added RefreshStops to dynamically change stops menus
      - added proper LayerSwitcher (using Matt Walker's code)
      - removed various bugs
    v0.4 Jan 2023 
      - added CreateLegManually (for handpicking OSM relation elements)
      - proper interface to select MultiLineString sections
      - added Leg.type, with appropriate pulldown menus
      - put the UI handling into classes of UI.js
      - removed various bugs
    v0.3 27 Dec 2022 - added copyLeg, ReturnOverLeg, MergeLegs
      - using Turf & JSTS libs for various spatial tasks 
        (eg. creating legs from MultiLineStrings)
    v0.2 22 Dec 2022 
      - removed various bugs
      - Added SearchLegs functionality
    v0.1 3 Dec 2022 - first version