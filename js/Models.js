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
            return {
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
        this.selected = false; // selector boolean used later in mapping and other selections
        this.toOlFeature = function () {
            // full OpenLayers Feature in GMercator
            return new ol.Feature({
                geometry: new ol.geom.Point(this.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857'),
                id: this.id,
                name: this.name,
                selected: this.selected
            });
        };
        this.toGeoJSON = function () {
            // full geoJSON feature, including attributes
            return {
                type: "Feature",
                geometry: this.geometry,
                properties: {
                    id: this.id,
                    name: this.name,
                }
            }
        };
    }
}

class Leg { // a leg of a trip: one train from boarding stop to disembarking stop
    constructor(id, name, coords, stopFrom, stopTo, startDateTime, endDateTime, notes, type) {
        this.id = id;
        this.name = name;// name given by user
        this.selected = false; // selector boolean used later in mapping and other selections
        this.geometry = { // simple GeoJSON Linestring geometry [[lon,lat],[lon,lat],...]
            type: "LineString",
            coordinates: coords,
        };
        this.bbox = [-90,-180,90,180]; // [minlat, minlon, maxlat, maxlon]; needs to be calculated from geom:
        this.stopFrom = stopFrom;
        this.stopTo = stopTo;
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
        this.notes = notes; // given by user
        this.type = type; // default = 0 = train
        this.toOlFeature = function () {
            // full OpenLayers Feature in GMercator
            return new ol.Feature({
                geometry: new ol.geom.LineString(this.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857'),
                id: this.id,
                name: this.name,
                type: this.type,
                selected: this.selected,
            });
        };
        this.toGeoJSON = function () {
            // creates full geoJSON feature, including attributes
            return {
                type: "Feature",
                geometry: this.geometry,
                properties: {
                    id: this.id,
                    name: this.name,
                    startdatetime: this.startDateTime,
                    enddatetime: this.endDateTime,
                    notes: this.notes,
                    type : this.type,
                    stopfrom: this.stopFrom.id,
                    stopto: this.stopTo.id
                }
            }
        };
    }
}

class Journey {
    constructor(id, name, notes, type, startDateTime, endDateTime, legs) {
        this.id = id;
        this.name = name;
        this.selected = true; // selector boolean used later in mapping and other selections
        this.notes = notes;
        this.type = type; // default = 0 = bussiness
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
        this.legs = []; // a list of Leg object IDs
    }
}
