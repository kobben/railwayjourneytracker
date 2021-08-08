## Railway Journey Tracker

©2021 Barend Köbben - <a href="mailto:b.j.kobben@utwente.nl">b.j.kobben@utwente.nl</a> 

this is a test for using GeoJSon  in OpenLayers that I started but never fully finished.

It lets you extract GeoJSON entities (Journey Legs) from the OSM public transport data
(train routes), which it can download from OSM and then extract portions of. 
It stores them in a DB (as **Legs**, i.e lines, and their end and start **Stops**, i.e points 
separately). I use a PostGreSQL DB. In this test I use the PostGREST interface, 
alternatively you probably can use Python to access the DB.

[comment]: <> ([Code available on GitHub]&#40;https://github.com/kobben/railwayjourneytracker)

Licensed under GNU General Public License v3.0 (see https://choosealicense.com/licenses/gpl-3.0/)

SPDX-License-Identifier: GPL-3.0-only

#### Changelist:
    v0.1 Aug 2021 - first published version
    v0.2 Aug 2021 - removed various bugs. 
                    Added SearchLegs functionality