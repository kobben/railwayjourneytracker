// ***************************************************************//
// **** Models contains the various CLASSes used in the app.

// ***************************************************************//
//  CLASS OSMrelation
//  models the  parts of the OSM Relation XML object used in this app
// ***************************************************************//
class OSMrelation {
    constructor(id, name, fromStop, toStop, fromName, toName, bbox, coords) {
        this.id = id; //= OSMid of relevant node
        this.name = name;
        this.fromStop = fromStop; // = Stop Class instance
        this.toStop = toStop; // = Stop Class instance
        this.fromName = fromName; // do not use for vital things, because this names initial;y comes from OSM...
        this.toName = toName;     // ..and does not match with official Stop node names (eg "Bahnhof" in Rel vs "Borkum Bahnhof" in Stop)
        this.bbox = bbox; // [minlat, minlon, maxlat, maxlon]; will be filled at creation from OSM bbox
        this.geometry = { // MultiLineString GeoJSON geometry [ [ [lon,lat],[lon,lat] ],[ [lon,lat],[ etc... ] ] ]
            type: "MultiLineString",
            coordinates: coords,
        };
        this.relStops = []; // these are the stops as listed in the OSMrelation, which are missing names
        this.stops = []; // this will become a list of actual Stop objects, with added names;
    }

    toOlFeature() {
        // full OpenLayers Feature in GMercator
        return new ol.Feature({
            geometry: new ol.geom.MultiLineString(this.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857'),
            id: this.id,
            name: this.name,
            from: this.fromName,
            to: this.toName,
        });
    }

    toGeoJSON() {
        // full GeoJSON Feature in lonlat
        let coordsStr = JSON.stringify(this.geometry.coordinates);
        return {
            type: "Feature",
            geometry: {
                type: "MultiLineString",
                coordinates: coordsStr
            },
            properties: {
                id: this.id,
                name: this.name,
                from: this.fromName,
                to: this.toName,
            }
        }
    }

    showOnMap(mapLayer) {
        mapLayer.addFeature(this.toOlFeature());
    }
}


// ***************************************************************//
//  CLASS StopsCollection
//  models a collection of STOPS as retrieved from the DB
//  Each STOP is an object as defined in the Class Stops below
// ***************************************************************//
class StopsCollection {
    constructor(mapLayer) {
        this.stopsarray = [];
        this.numstops = 0;
        this.wherestr = '';
        this.mapLayer = mapLayer; // if null, then non-mappable layer!
    }

    async loadFromDB(whereStr) {
        let stopsFound = [];
        let newStop = undefined;
        let postUrl = '/stops?';
        postUrl += 'select=id,name,geojson';
        postUrl += '&order=name.asc&' + whereStr;
        // console.log(postUrl);
        let resultJSON = await DB.query("GET", postUrl);
        if (resultJSON.error === true) {
            DB.giveErrorMsg(resultJSON);
        } else {
            for (let stopfound of resultJSON.data) {
                if (stopfound.geojson === null || stopfound.geojson === undefined) {
                    UI.SetMessage('Skipped Stop object without valid geojson: ' + stopfound.id, workflowMsg);
                } else {
                    newStop = new Stop(stopfound.id, stopfound.name, undefined);
                    newStop.selected = false;
                    newStop.geometry = stopfound.geojson;
                    stopsFound.push(newStop);
                    newStop = undefined;
                }
            }
            this.stopsarray = stopsFound;
            this.wherestr = whereStr;
            this.numstops = this.stopsarray.length;
        }
    }

    getNumStops() {
        this.numstops = this.stopsarray.length;
        return this.numstops;
    }

    getStops() {
        return this.stopsarray;
    }

    setStops(stopsArray) {
        this.stopsarray = stopsArray;
        this.numstops = this.stopsarray.length;
    }

    getStopById(id) {
        for (let aStop of this.stopsarray) {
            if (aStop.id === id) {
                return aStop;
            }
        }
        return undefined;
    }

    addStop(aStop) {
        this.stopsarray.push(aStop);
        this.numstops = this.stopsarray.length;
    }


    getWhereStr() {
        return this.wherestr;
    }

    mapStops(zoomToExtent = false, clearMap = true) {
        if (this.mapLayer === null) {
            UI.SetMessage('Warning: trying to map non-mappable layer!', warningMsg, null);
        } else {
            if (clearMap) this.clearMap(this.mapLayer);
            for (let aStop of this.stopsarray) {
                aStop.showOnMap(this.mapLayer);
            }
            if (zoomToExtent) {
                MAP.zoomToBbox(this.calculateBbox(false));
            }
        }
    }

    clearMap() {
        if (this.mapLayer === null) {
            UI.SetMessage('Warning: trying to map non-mappable layer!', warningMsg, null);
        } else {
            this.mapLayer.clear();
            for (let aStop of this.stopsarray) {
                aStop.mapped = false;
            }
        }
    }

    calculateBbox(selectedOnly = false) {
        if (this.numstops < 1) { // if the Stops is empty (eg because DB returned nothing):
            UI.SetMessage("[CalculateStopsBbox] WARNING: No Stops, so no (valid) BBOX!", warningMsg);
            return undefined;
        } else {
            let boxChanged = false;
            let warnings = 0;
            let minlat = 90;
            let minlon = 180;
            let maxlat = -90;
            let maxlon = -180;
            for (let aStop of this.stopsarray) {
                if (aStop.geometry.coordinates) {
                    if (!selectedOnly || aStop.selected) {
                        boxChanged = true;
                        if (aStop.geometry.coordinates[1] < minlat) minlat = aStop.geometry.coordinates[1];
                        if (aStop.geometry.coordinates[0] < minlon) minlon = aStop.geometry.coordinates[0];
                        if (aStop.geometry.coordinates[1] > maxlat) maxlat = aStop.geometry.coordinates[1];
                        if (aStop.geometry.coordinates[0] > maxlon) maxlon = aStop.geometry.coordinates[0]
                    }
                } else {
                    warnings++;
                }
            }
            if (warnings !== 0) UI.SetMessage("[CalculateStopsBbox] WARNING: ' + warnings + ' Stops have no (valid) coordinates!", warningMsg);
            if (boxChanged) {
                return [minlat, minlon, maxlat, maxlon];
            } else { // no result, usually because no selected stops AND selectedOnly=true
                UI.SetMessage("[CalculateStopsBbox] WARNING: No selected Stops, so no (valid) BBOX!", warningMsg);
                return undefined;
            }
        }
    }

    selectStops(id = 0, zoomto = false)  {

        if (this.mapLayer === null) {
            UI.SetMessage('Warning: trying to map non-mappable layer!', warningMsg, null);
        } else {
            for (let aStop of this.stopsarray) {
                if (id === 0) { // 0 => all OFF
                    aStop.selected = false;
                } else if (id === 1) { // 1 => all on
                    aStop.selected = true;
                } else {  // id = toggle just this one
                    if (id === aStop.id) {
                        aStop.selected = !aStop.selected;
                    }
                }
                aStop.selectOnMap(aStop.selected, this.mapLayer, zoomto);
                let isRowInTable = document.getElementById("select_" + aStop.id);
                if (isRowInTable) isRowInTable.checked = aStop.selected;
            }
        }
    }

}

// ***************************************************************//
//  CLASS Stop
//  models a STOP as retrieved from the DB
// ***************************************************************//
class Stop {
    constructor(id, name, coords) {
        this.id = id; //= OSMid of relevant node
        this.name = name;
        this.geometry = { // simple GeoJSON geometry [lon,lat]
            type: "Point",
            coordinates: coords,
        };
        this.selected = false; // selector boolean used later in mapping and other selections
        this.mapped = false; // selector boolean used later in mapping and other selections
    }

    toOlFeature() {
        // full OpenLayers Feature in GMercator
        return new ol.Feature({
            geometry: new ol.geom.Point(this.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857'),
            id: this.id,
            name: this.name,
            selected: this.selected,
            mapped: this.mapped,
        });
    }

    toGeoJSON() {
        // full geoJSON feature, including attributes
        return {
            type: "Feature",
            geometry: this.geometry,
            properties: {
                id: this.id,
                name: this.name,
            }
        }
    }

    showOnMap(mapLayer) {
        if (!this.mapped) { // avoid showing same Stop twice
            mapLayer.addFeature(this.toOlFeature());
            this.mapped = true;
        }
    }

    removeFromMap(mapLayer) {
        let F = mapLayer.getFeatures();
        for (let f of F) {
            if (f.get('id') === this.id) {
                mapLayer.removeFeature(f);
                this.mapped = false;
                this.selected = false;
            }
        }
    }

    selectOnMap(selected, mapLayer, zoomto = false) {
        if (!this.mapped) { // if not mapped yet, map it first
            this.showOnMap(mapLayer);
        }
        let F = mapLayer.getFeatures();
        for (let f of F) {
            if (f.get('id') === this.id) {
                if (selected) {
                    f.set('selected', true);
                    this.selected = true;
                    if (zoomto) {
                        let myBbox = [
                            this.geometry.coordinates[1]-0.0025,
                            this.geometry.coordinates[0]-0.0025,
                            this.geometry.coordinates[1]+0.0025,
                            this.geometry.coordinates[0]+0.0025
                            ];
                        APP.map.zoomToBbox(myBbox);
                    }
                } else {
                    f.set('selected', false);
                    this.selected = false;
                }
            }
        }
    }
}

// ***************************************************************//
//  CLASS LegsCollection
//  models a collection of LEGs as retrieved from the DB
//  Each LEG is an object as defined in Class Legs below
//  Each leg holds 2 pointers to Stop objects (for start and end of Leg)
//
//  Note: a Leg is NOT a Journey as the Legs can be completely disparate
//  in time and location!
// ***************************************************************//
// ****

class LegsCollection {
    constructor(mapLayer) {
        this.legsarray = [];
        this.numlegs = 0;
        this.wherestr = '';
        this.mapLayer = mapLayer;
    }

    async loadFromDB(whereStr = '', legStopsCollection = null) {
        // get ALL journeys that ALL legs are in:
        let legsInJourneys = await DB.loadLegsInJourneysFromDB();
        let legsFound = [];
        let loadedLeg = undefined;
        let postUrl = '/legs?';
        postUrl += 'select=id,startdatetime,enddatetime,timesequential,notes,type,geojson,km,';
        /**
         * below is an ugly workaround for not being able to do or=() on embedded resources,
         * asking for stopto_obj embedded for further processing, and use stopto for searching in WhereStr:
         */
        postUrl += 'stopfrom_obj:stopfrom(id,name,geojson),stopto_obj:stopto(id,name,geojson),stopfrom,stopto';
        /**
         * we would prefer to simply do this:
         */
        // postUrl += 'stopfrom(id,name,geojson),stopto(id,name,geojson)';
        postUrl += '&order=startdatetime.desc.nullslast&' + whereStr;
        let resultJSON = await DB.query("GET", postUrl);
        if (resultJSON.error === true) {
            DB.giveErrorMsg(resultJSON);
        } else {
            for (let legfound of resultJSON.data) {
                if (legfound.geojson === null || legfound.geojson === undefined) {
                    UI.SetMessage('Skipped Leg object without valid geojson! ID = ' + legfound.id, warningMsg);
                } else {
                    loadedLeg = new Leg(legfound.id, undefined, legfound.stopfrom_obj, legfound.stopto_obj, legfound.startdatetime, legfound.enddatetime, legfound.notes, legfound.type, legfound.timesequential);
                    loadedLeg.selected = false;
                    loadedLeg.geometry = legfound.geojson;
                    loadedLeg.bbox = calcBbox(legfound.geojson.coordinates);
                    if (legStopsCollection !== null) {
                        for (let aStop of APP.allstops.getStops()) {
                            if (aStop.id === loadedLeg.stopFrom.id || aStop.id === loadedLeg.stopTo.id) {
                                legStopsCollection.addStop(aStop);
                            }
                        }
                    }
                    // get journeys that THIS leg is in:
                    for (let journeyJSON of legsInJourneys) {
                        if (journeyJSON.legsarray.includes(legfound.id)) loadedLeg.partofjourney = journeyJSON.id;
                    }
                    loadedLeg.km = legfound.km;
                    legsFound.push(loadedLeg);
                    loadedLeg = undefined;
                }
            }
        }
        this.legsarray = legsFound;
        this.wherestr = whereStr;
        this.numlegs = this.legsarray.length;
    }

    getNumLegs() {
        this.numlegs = this.legsarray.length;
        return this.numlegs;
    }

    getLegs() {
        return this.legsarray
    }

    getSelectedLegs() {
        let selArray = [];
        for (let aLeg of this.legsarray) {
            if (aLeg.selected) {
                selArray.push(aLeg);
            }
        }
        return selArray;
    }

    setLegs(legsArray) {
        this.legsarray = legsArray;
        this.numlegs = this.legsarray.length;
    }

    getLegById(id) {
        for (let aLeg of this.legsarray) {
            if (aLeg.id === id) {
                return aLeg;
            }
        }
        return undefined;
    }

    addLeg(aLeg) {
        this.legsarray.push(aLeg);
        this.numlegs = this.legsarray.length;
    }

    getWhereStr() {
        return this.wherestr;
    }

    mapLegs(legStopsCollection = null, zoomToExtent = true, clearMap = true) {
       if (clearMap) this.clearMap(this.mapLayer);
        for (let aLeg of this.legsarray) {
            aLeg.showOnMap(this.mapLayer);
        }
        if (legStopsCollection !== null) {
            legStopsCollection.mapStops(false, clearMap);
        }
        if (zoomToExtent) {
            MAP.zoomToBbox(this.calculateBbox(false));
        }
    }

    clearMap() {
        this.mapLayer.clear();
        for (let aLeg of this.legsarray) {
            aLeg.mapped = false;
        }
    }

    calculateBbox(selectedOnly = false) {
        if (this.numlegs === 0) { // if the Legs is empty (eg because DB returned nothing):
            UI.SetMessage("[CalculateLegsBbox] WARNING: No Legs, so no (valid) BBOX!", warningMsg);
            return [-90, -180, 90, 180]; // bbox is whole world
        } else {
            let warnings = 0;
            let minlat = 90;
            let minlon = 180;
            let maxlat = -90;
            let maxlon = -180;
            for (let aLeg of this.legsarray) {
                if (aLeg.bbox) {
                    if (!selectedOnly || aLeg.selected) {
                        if (aLeg.bbox[0] < minlat) minlat = aLeg.bbox[0];
                        if (aLeg.bbox[1] < minlon) minlon = aLeg.bbox[1];
                        if (aLeg.bbox[2] > maxlat) maxlat = aLeg.bbox[2];
                        if (aLeg.bbox[3] > maxlon) maxlon = aLeg.bbox[3];
                    }
                } else {
                    warnings++;
                }
            }
            if (warnings !== 0) UI.SetMessage("[CalculateLegsBbox] WARNING: ' + warnings + ' Legs have no (valid) BBOX!", warningMsg);
            return [minlat, minlon, maxlat, maxlon];
        }
    }

    selectLegs(id = 0) { // id is either a leg ID, or 0 for unselect all, 1 for select all
        if (this.mapLayer === null) {
            UI.SetMessage('Warning: trying to select on non-mappable layer!', warningMsg, null);
        } else {
            for (let aLeg of this.legsarray) {
                if (id === 0) { // 0 => all off
                    aLeg.selected = false;
                } else if (id === 1) { // 1 => all on
                    aLeg.selected = true;
                } else {  // id => toggle just this one
                    if (id === aLeg.id) {
                        aLeg.selected = !aLeg.selected;
                    }
                }
                aLeg.selectOnMap(aLeg.selected, this.mapLayer);
                let isRowInTable = document.getElementById("select_" + aLeg.id);
                if (isRowInTable) isRowInTable.checked = aLeg.selected;
            }
        }
    }

}

// ***************************************************************//
//  CLASS Leg
//  models a LEG as retrieved from the DB
// a Leg of a Journey = one train from boarding stop to disembarking stop
// ***************************************************************//
class Leg {
    constructor(id, coords, stopFrom, stopTo, startDateTime, endDateTime, notes, type, timesequential, km) {
        this.id = id;
        this.geometry = { // simple GeoJSON Linestring geometry [[lon,lat],[lon,lat],...]
            type: "LineString",
            coordinates: coords,
        };
        this.bbox = [-90, -180, 90, 180]; // [minlat, minlon, maxlat, maxlon]; needs to be calculated from geom:
        this.stopFrom = stopFrom;
        this.stopTo = stopTo;
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
        this.notes = notes; // given by user
        this.type = type; // default = 0 = train
        this.timesequential = timesequential; // default = false
        this.selected = false; // selector boolean used later in mapping and other selections
        this.mapped = false; // selector boolean used later in mapping and other selections
        this.partofjourney = undefined;
        this.km = km;
    }

    getID() {
        return this.id;
    }

    toOlFeature() {
        // full OpenLayers Feature in GMercator
        let stFname = (this.stopFrom === undefined ? 'undefined' : this.stopFrom.name);
        let stTname = (this.stopTo === undefined ? 'undefined' : this.stopTo.name);
        return new ol.Feature({
            geometry: new ol.geom.LineString(this.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857'),
            id: this.id,
            type: this.type,
            stopFromName: stFname,
            stopToName: stTname,
            startDateTime: this.startDateTime,
            endDateTime: this.endDateTime,
            notes: this.notes,
            selected: this.selected,
            mapped: this.mapped,
            km: this.km,
        });
    }

    toGeoJSON() {
        // creates full geoJSON feature, including attributes
        return {
            type: "Feature",
            geometry: this.geometry,
            properties: {
                id: this.id,
                startdatetime: this.startDateTime,
                enddatetime: this.endDateTime,
                notes: this.notes,
                type: this.type,
                timesequential: this.timesequential,
                stopfrom: this.stopFrom.id,
                stopto: this.stopTo.id.stopto,
                km: this.km,
            }
        }
    }

    isPartOfJourney() {
        if (this.partofjourney === undefined) {
            return undefined;
        } else {
            return this.partofjourney;
        }
    }

    showOnMap(mapLayer) {
        if (!this.mapped) { // avoid showing same Leg twice
            mapLayer.addFeature(this.toOlFeature());
            this.mapped = true;
        }
    }

    removeFromMap(mapLayer) {
        let F = mapLayer.getFeatures();
        for (let f of F) {
            if (f.get('id') === this.id) {
                mapLayer.removeFeature(f);
                this.mapped = false;
            }
        }
    }

    selectOnMap(selected, mapLayer) {
        let F = mapLayer.getFeatures();
        for (let f of F) {
            if (f.get('id') === this.id) {
                if (selected) {
                    f.setStyle(MAP.LegSelectedStyle);
                } else {
                    if (mapLayer === APP.map.getLayerDataByName("Legs")) {
                        f.setStyle(MAP.LegStyle);
                    } else if (mapLayer === APP.map.getLayerDataByName("NewLegs")) {
                        f.setStyle(MAP.LegStyle);
                    } else { // on "Journeys" maplayer
                        f.setStyle(MAP.JourneyStyle);
                    }
                }
            }
        }
    }

}

// ***************************************************************//
//  CLASS JourneysCollection
//  models a collection of JOURNEYs as retrieved from the DB
//  Each JOURNEY is an object as defined in Class JOURNEY below
//
// ***************************************************************//
//
class JourneysCollection {

    constructor(mapLayer) {
        this.journeysarray = [];
        this.numjourneys = 0;
        this.wherestr = '';
        this.mapLayer = mapLayer;
    }

    async loadFromDB(whereStr = '') {
        let journeysFound = [];
        let loadedJourney = undefined;
        let postUrl = '/journeys?';
        postUrl += 'select=id,notes,type,startdatetime,enddatetime,legsarray,'; //NOTE: legsarray = array of leg IDs, not Leg objects!!

        /**
         * below is an ugly workaround for not being able to do or=() on embedded resources,
         * asking for stopto_obj embedded for further processing, and use stopto for searching in WhereStr:
         */
        postUrl += 'stopfrom_obj:stopfrom(id,name,geojson),stopto_obj:stopto(id,name,geojson),stopfrom,stopto';
        /**
         * we would prefer to simply do this:
         */
        // postUrl += 'stopfrom(id,name,geojson),stopto(id,name,geojson)';

        postUrl += '&order=startdatetime.desc.nullslast&' + whereStr;
        // console.log(postUrl);
        let resultJSON = await DB.query("GET", postUrl);
        if (resultJSON.error === true) {
            DB.giveErrorMsg(resultJSON);
        } else {
            for (let aJourney of resultJSON.data) {
                    loadedJourney = new Journey(aJourney.id, aJourney.notes, aJourney.type, aJourney.legsarray,
                        aJourney.stopfrom_obj,aJourney.stopto_obj,aJourney.startdatetime,aJourney.enddatetime);
                    await loadedJourney.loadJourneyLegsFromDB(); // necessary to get Leg geometries and stops from the LEGS table in DB
                    journeysFound.push(loadedJourney);
                    loadedJourney = undefined;
            }
        }
        this.journeysarray = journeysFound;
        this.wherestr = whereStr;
        this.numjourneys = this.journeysarray.length;
    }

    getNumJourneys() {
        this.numjourneys = this.journeysarray.length;
        return this.numjourneys;
    }

    getJourneys() {
        return this.journeysarray
    }

    getSelectedJourneys() {
        let selArray = [];
        for (let aJourney of this.journeysarray) {
            if (aJourney.selected) {
                selArray.push(aJourney);
            }
        }
        return selArray;
    }

    setJourneys(journeysarray) {
        this.journeysarray = journeysarray;
        this.numjourneys = this.journeysarray.length;
    }

    getJourneyById(id) {
        for (let aJourney of this.journeysarray) {
            if (aJourney.id === id) {
                return aJourney;
            }
        }
        return undefined;
    }

    addJourney(theJourney) {
        this.journeysarray.push(theJourney);
        this.numjourneys = this.journeysarray.length;
    }

    removeJourney(theJourney) {
        this.journeysarray.splice(this.journeysarray.findIndex(aJourney => aJourney.id === theJourney.id), 1);
        this.numjourneys = this.journeysarray.length;
    }

    getWhereStr() {
        return this.wherestr;
    }

    mapJourneys(zoomToExtent = true, clearMap = true) {
        if (clearMap) this.clearMap(this.mapLayer);
        for (let aJourney of this.journeysarray) {
            aJourney.showOnMap(this.mapLayer);
        }
        if (zoomToExtent) {
            MAP.zoomToBbox(this.calculateBbox(false));
        }
    }

    clearMap() {
        this.mapLayer.clear();
        for (let aJourney of this.journeysarray) {
            aJourney.mapped = false;
            aJourney.legscollection.clearMap();
            aJourney.stopscollection.clearMap();
        }
    }

    calculateBbox(selectedOnly = false) {
        if (this.numjourneys === 0) { // if the Legs is empty (eg because DB returned nothing):
            UI.SetMessage("[JourneyCollection.calculateBbox] WARNING: No Journeys, so no (valid) BBOX!", warningMsg);
            return [-90, -180, 90, 180]; // bbox is whole world
        } else {
            let warnings = 0;
            let minlat = 90;
            let minlon = 180;
            let maxlat = -90;
            let maxlon = -180;
            for (let aJourney of this.journeysarray) {
                let theBbox = aJourney.calculateBbox();
                if (theBbox) {
                    if (!selectedOnly || aJourney.selected) {
                        if (theBbox[0] < minlat) minlat = theBbox[0];
                        if (theBbox[1] < minlon) minlon = theBbox[1];
                        if (theBbox[2] > maxlat) maxlat = theBbox[2];
                        if (theBbox[3] > maxlon) maxlon = theBbox[3];
                    }
                } else {
                    warnings++;
                }
            }
            if (warnings !== 0) UI.SetMessage('[JourneyCollection.calculateBbox] WARNING: ' + warnings + ' Journeys have no (valid) BBOX!', warningMsg);
            return [minlat, minlon, maxlat, maxlon];
        }
    }

    selectJourneys(id = 0) { // id is either a Journey ID, or 0 for unselect all, or 1 for select all
        if (this.mapLayer === null) {
            UI.SetMessage('Warning: trying to map non-mappable layer!', warningMsg, null);
        } else {
            for (let aJourney of this.journeysarray) {
                if (id === 0) { // 0 => all off
                    aJourney.selected = false;
                } else if (id === 1) { // 1 => all on
                    aJourney.selected = true;
                } else {  // id => toggle just this one
                    if (id === aJourney.id) {
                        aJourney.selected = !aJourney.selected;
                    }
                }
                aJourney.selectOnMap(aJourney.selected, this.mapLayer);
                let rowInTable = document.getElementById("select_" + aJourney.id);
                if (rowInTable) rowInTable.checked = aJourney.selected;
            }
        }
    }

}

// ***************************************************************//
//  CLASS Journey
//  models a LOGICAL collection of Legs that together form a JOURNEY
//   = several trains connected in time and place, to take a journey
//   from origin to destination
//  Each Journey holds collections of associated Legs and Stops
// ***************************************************************//
class Journey {
    constructor(id, notes, type, legsIDs, stopfrom, stopto, startdatetime, enddatetime) {
        // these simply come from DB:
        this.id = id;
        this.notes = notes;
        this.type = type;
        this.legsIDArray = legsIDs; // an array of Leg object IDs
        // these also come from DB initially, but are recalculated later,
        // because the underlying Legs may have changed:
        this.stopFrom = stopfrom;
        this.stopTo = stopto;
        this.startDateTime = startdatetime;
        this.endDateTime = enddatetime;
        // these will be created based on the legIDArray, in loadJourneyLegsFromDB:
        this.legscollection = new LegsCollection(APP.map.getLayerDataByName("Journeys"));
        this.stopscollection = new StopsCollection(APP.map.getLayerDataByName("Stops"));
        // these are set and get in the APP:
        this.selected = false; // selector boolean used later in mapping and other selections
        this.mapped = false;
    }

    async loadJourneyLegsFromDB() {
         let theWhereStr = 'id=in.(' + this.legsIDArray + ')';
         await this.legscollection.loadFromDB(theWhereStr, this.stopscollection);
        // sort Legs  ascending by startDateTime, needed because the DB result might not
        // be in time-order (which is correct in the legIDs Array)
        let sortedLegs = this.legscollection.getLegs().sort(function (a, b) {
            const dt1 = new Date(a.startDateTime)
            const dt2 = new Date(b.startDateTime)
            return dt1 - dt2;
        });
        // we recalculate these, because the underlying Legs may have changed:
        this.stopFrom = sortedLegs[0].stopFrom;
        this.stopTo = sortedLegs[sortedLegs.length-1].stopTo;
        this.startDateTime = sortedLegs[0].startDateTime;
        this.endDateTime = sortedLegs[sortedLegs.length-1].endDateTime;
    }

    getID() {
        return this.id;
    }

    getLegIDs() {
        return this.legsIDArray;
    }

    getLegsCollection() {
        return this.legscollection;
    }
    
    getStopsCollection() {
        return this.stopscollection;
    }

    calculateBbox() {
        return this.legscollection.calculateBbox(false); // [minlat, minlon, maxlat, maxlon];
    }

    showOnMap(mapLayer) {
        if (!this.mapped) { // avoid showing same Leg twice
           this.legscollection.mapLegs(this.stopscollection, false, false);
           this.mapped = true;
        }
    }

    removeFromMap(mapLayer) {
        let F = mapLayer.getFeatures();
        for (let f of F) {
            if (this.getLegIDs().includes(f.get('id')) ) { //is the Leg in the Journey?
                mapLayer.removeFeature(f);
                this.mapped = false;
            }
        }
    }

    selectOnMap(selected, mapLayer) {
        let F = mapLayer.getFeatures();
        for (let f of F) {
            let mappedLegID = f.get('id');
            if ( this.getLegIDs().includes(mappedLegID) ) { //this Leg is part of this Journey
                if (selected) {
                    this.getLegsCollection().getLegById(mappedLegID).selected = true;
                    f.setStyle(MAP.JourneySelectedStyle);
                } else {
                    this.getLegsCollection().getLegById(mappedLegID).selected = false;
                    if (mapLayer === APP.map.getLayerDataByName("Legs")) {
                        f.setStyle(MAP.LegStyle);
                    } else { // on "Journeys" maplayer
                        f.setStyle(MAP.JourneyStyle);
                    }
                }
            }
        }
    }

}

