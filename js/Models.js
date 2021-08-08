class OSMrelation {
    constructor(id, name, from, to, bbox, coords) {
        this.id = id; //= OSMid of relevant node
        this.name = name;
        this.from = from; // do not use for vital things, because these names often do...
        this.to = to;     // ..not match with Stop node names (eg "Bahnhof" in Rel vs "Borkum Bahnhof" in Stop)
        this.bbox = bbox; // [minlat, minlon, maxlat, maxlon]; will be filled at creation from OSM bbox
        this.geometry = { // MultiLineString GeoJSON geometry [ [ [lon,lat],[lon,lat] ],[ [lon,lat],[ etc... ] ] ]
            type: "MultiLineString",
            coordinates: coords,
        };
        this.stops = []; // this will become more than the stoplist of the OSM relation, which is missing names!
        this.toOlFeature = function () {
            // full OpenLayers Feature in GMercator
            return new ol.Feature({
                geometry: new ol.geom.MultiLineString(this.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857'),
                id: this.id,
                name: this.name,
                from: this.from,
                to: this.to,
            });
        };
        this.toGeoJSON = function () {
            // full GeoJSON Feature in lonlat
            let coordsStr = JSON.stringify(this.geometry.coordinates);
            let jsonObj = {
                type: "Feature",
                geometry: {
                    type: "MultiLineString",
                    coordinates: coordsStr
                },
                properties: {
                    id: this.id,
                    name: this.name
                }
            }
            return jsonObj;
        };
    }
}


class Stop {
    constructor(id, name, coords) {
        this.id = id; //= OSMid of relevant node
        this.name = name;
        this.geometry = { // simple GeoJSON geometry [lon,lat]
            type: "Point",
            coordinates: coords,
        };
        this.toOlFeature = function () {
            // full OpenLayers Feature in GMercator
            return new ol.Feature({
                geometry: new ol.geom.Point(this.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857'),
                id: this.id,
                name: this.name,
            });
        };
        this.toGeoJSON = function () {
            // full geoJSON feature, including attributes
            let jsonObj = {
                type: "Feature",
                geometry: this.geometry,
                properties: {
                    id: this.id,
                    name: this.name
                }
            }
            return jsonObj;
        };
    }
}

class Leg { // a leg of a trip: one train from boarding stop to disembarking stop
    constructor(id, name, coords, stopFrom, stopTo, OSMrelationID, OSMrelationName,
                 startDateTime, endDateTime, notes) {
        this.id = id;
        this.name = name;// name given by user
        this.selected = true; // selector boolean used later in mapping and other selections
        this.geometry = { // simple GeoJSON Linestring geometry [[lon,lat],[lon,lat],...]
            type: "LineString",
            coordinates: coords,
        };
        this.bbox = [-90,-180,90,180]; // [minlat, minlon, maxlat, maxlon]; needs to be calculated from geom:
        this.stopFrom = stopFrom;
        this.stopTo = stopTo;
        this.OSMrelationID = OSMrelationID; // = OSMid of OSMrelation this was extracted from
        this.OSMrelationName = OSMrelationName; // = name of OSMrelation this was extracted from
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
        this.notes = notes; // given by user
        this.toOlFeature = function () {
            // full OpenLayers Feature in GMercator
            return new ol.Feature({
                geometry: new ol.geom.LineString(this.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857'),
                id: this.id,
                name: this.name,
            });
        };
        this.toGeoJSON = function () {
            // creates full geoJSON feature, including attributes
            let jsonObj = {
                type: "Feature",
                geometry: this.geometry,
                properties: {
                    id: this.id,
                    name: this.name,
                    startdatetime: this.startDateTime,
                    enddatetime: this.endDateTime,
                    notes: this.notes,
                    osmrelationid: this.OSMrelationID,
                    osmrelationname: this.OSMrelationName,
                    stopfrom: this.stopFrom.id,
                    stopto: this.stopTo.id
                }
            }
            return jsonObj;
        };
    }
}

class Trip {
    constructor(id, name, notes, startDateTime, endDateTime, legs) {
        this.id = id;
        this.name = name;
        this.type = undetermined;
        this.selected = true; // selector boolean used later in mapping and other selections
        this.notes = notes;
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
        this.legs = []; // a list of Leg object IDs
    }
}
