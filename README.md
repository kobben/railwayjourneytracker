## Railway Journey Tracker

©2022 Barend Köbben - <a href="mailto:b.j.kobben@utwente.nl">b.j.kobben@utwente.nl</a> 

This is a WebApp for keeping track of reilway journeys. It lets you extract GeoJSON entities (Journey Legs) from the OSM public transport data
(train routes), which it can download from OSM and then extract portions of. 
It stores them in a DB (as **Legs**, i.e lines, and their end and start **Stops**, i.e points 
separately). It stores the data in a PostGreSQL DB, so is only needing OSM when creating new legs.
The PostGREST REST interface to the Postgres DB is used by this purely Javascript (ECMA 5 compliant) application running on any modern browser
(basically anything other then Internet Explorer).

### [Code available on GitHub](https://github.com/kobben/railwayjourneytracker)

Licensed under GNU General Public License v3.0 (see https://choosealicense.com/licenses/gpl-3.0/)

SPDX-License-Identifier: GPL-3.0-only

#### Links to libraries and software used:
* OpenStreetMap Overpass API: https://wiki.openstreetmap.org/wiki/Overpass_API
* PostgreSQL database: https://www.postgresql.org
* PostGREST REST interface to DB: https://postgrest.org
* OpenLayers webmapping API: https://openlayers.org 
* OpenLayers LayerSwitcher plugin: https://github.com/walkermatt/ol-layerswitcher/
* JSTS library of spatial predicates and functions for processing geometry: https://github.com/bjornharrtell/jsts
* TURF Modular, simple-to-understand JavaScript functions that speak GeoJSON: https://turfjs.org

#### Changelist:
    v0.5 Jan 2022 - added TruncateLeg
                  - all modules now start with loading legs step  
                  - constructLeg now also finds tram, subway & ferry routes
                  - added RefreshStops to dynamically change stops menus
                  - added proper LayerSwitcher (using Matt Walker's code)
                  - removed various bugs
    v0.4 Dec 2021 - added CreateLegManually (for handpicking OSM relation elements)
                  - added DrawLeg (for fully hand-drawn)
                  - proper interface to select MultiLineString sections
                  - added Leg.type, with appropriate pulldown menus
                  - put the UI handling into classes of UI.js
                  - removed various bugs
    v0.3 Oct 2021 - added copyLeg, ReturnOverLeg, MergeLegs
                  - using Turf & JSTS libs for various spatial tasks 
                    (eg. creating legs from MultiLineStrings)
    v0.2 Aug 2021 - removed various bugs
                    Added SearchLegs functionality
    v0.1 Aug 2021 - first version