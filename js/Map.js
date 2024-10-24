/**
 * MAP object:
 *
 * Various methods and properties belonging to a MAP object
 * Uses Mapping functionality from :
 * OpenLayers API v7.2.2 (https://openlayers.org)
 * ol-layerswitcher 4.1.0 (https://github.com/walkermatt/ol-layerswitcher)
 *
 * Licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 3.0 License.
 * see http://creativecommons.org/licenses/by-nc-sa/3.0/
 *
 * @author Barend Kobben - b.j.kobben@utwente.nl
 *
 */

MAP = {

//Map GLOBALS:
    name: undefined,
    mapObj: undefined,
    mapView: undefined,
    mapDraw: undefined,
    stopStyleRed: undefined,
    stopStyleNone: undefined,
    stopStyleBlue: undefined,
    stopStyleGreen: undefined,
    lineStyleRed: undefined,
    lineStyleBlue: undefined,
    lineStyleGreen: undefined,
    lineStyleGrey: undefined,
    lineStyleNone: undefined,
    StopStyle: undefined,
    StopSelectedStyle: undefined,
    LegStyle: undefined,
    LegSelectedStyle: undefined,
    JourneyStyle: undefined,
    JourneySelectedStyle: undefined,

//Map METHODS:

    init: function (mapName, startCoords, startZoom, onClickCallback, showCoords = false) {
        let _mapObj, _mapView; //local versions
        _mapObj = new ol.Map({target: "mapDiv"});
        const osmLayer = new ol.layer.Tile({
            name: 'OSM',
            title: 'OSM Standard', //title is needed for layerswitcher
            type: 'base', //type is needed for layerswitcher
            source: new ol.source.OSM()
        });
        const noBase = new ol.layer.Tile({ //empty base layer for 'none'
            name: 'None',
            title: 'None', //title is needed for layerswitcher
            type: 'base', //type is needed for layerswitcher
        });
        const transportOSMKey = "d4674680716f4dc7b9e5228f66cd360c";
        const osmTransportLayer = new ol.layer.Tile({
            name: 'OSMTransport',
            title: 'OSM Transport', //title is needed for layerswitcher
            type: 'base', //type is needed for layerswitcher
            source: new ol.source.OSM({
                attributions: [
                    'Background: ©<a href="https://www.thunderforest.com/">OSM Transport</a>'],
                url:
                    'https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + transportOSMKey,
            }),
        });
        const openRailwayMap = new ol.layer.Tile({
            name: 'openRailwayMap',
            title: 'Open Railway Map', //title is needed for layerswitcher
            source: new ol.source.XYZ({
                attributions: [
                    ' <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>'],
                url: 'https://{a-c}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
                crossOrigin: null, //make it work inside canvas
                tilePixelRatio: 2, //server returns 512px img for 256 tiles
                maxZoom: 19, // XYZ's default is 18
                opaque: false
            })
        });
        const emptyGeojsonLayer = {
            'type': 'FeatureCollection',
            'features': []
        };
        let stopsData = new ol.source.Vector({
            features: new ol.format.GeoJSON().readFeatures(emptyGeojsonLayer)
        });
        let newStopsData = new ol.source.Vector({
            features: new ol.format.GeoJSON().readFeatures(emptyGeojsonLayer)
        });
        let legsData = new ol.source.Vector({
            features: new ol.format.GeoJSON().readFeatures(emptyGeojsonLayer)
        });
        let newLegsData = new ol.source.Vector({
            features: new ol.format.GeoJSON().readFeatures(emptyGeojsonLayer)
        });
        let journeysData = new ol.source.Vector({
            features: new ol.format.GeoJSON().readFeatures(emptyGeojsonLayer)
        });
        const stopStyleNone = new ol.style.Style({
            image: new ol.style.Circle({
                radius: 0,
                fill: new ol.style.Fill({
                    color: 'rgba(0, 0, 0, 0)',
                }),
                stroke: new ol.style.Stroke({
                    color: 'rgba(0, 0, 0, 0)',
                    width: 0,
                })
            }),
            zIndex:1,
        });
        const stopStyleRed = new ol.style.Style({
            image: new ol.style.Circle({
                radius: 8,
                fill: new ol.style.Fill({
                    color: 'rgba(255, 0, 0, 0.6)',
                }),
                stroke: new ol.style.Stroke({
                    color: 'rgba(255, 0, 0, 0.9)',
                    width: 2,
                }),
            }),
            text: new ol.style.Text({
                font: 'bold 12px "Open Sans", "Arial Unicode MS", "sans-serif"',
                offsetX: 10,
                offsetY: -2,
                textAlign: 'left',
                textBaseline: 'center',
                fill: new ol.style.Fill({
                    color: 'rgba(255, 0, 0, 0.9)',
                }),
                stroke: new ol.style.Stroke({
                    color: 'white',
                    width: 4,
                }),
            }),
            zIndex:999,
        });
        const stopStyleGreen = new ol.style.Style({
            image: new ol.style.Circle({
                radius: 5,
                fill: new ol.style.Fill({
                    color: 'rgba(17,116,41,0.4)',
                }),
                stroke: new ol.style.Stroke({
                    color: 'rgba(17,116,41,0.8)',
                    width: 2,
                }),
            }),
            text: new ol.style.Text({
                font: 'bold 12px "Open Sans", "Arial Unicode MS", "sans-serif"',
                offsetX: 10,
                offsetY: -2,
                textAlign: 'left',
                textBaseline: 'center',
                fill: new ol.style.Fill({
                    color: 'rgba(17,116,41,0.9)',
                }),
                stroke: new ol.style.Stroke({
                    color: 'white',
                    width: 4,
                })
            }),
            zIndex:200,
        });
        const stopStyleBlue = new ol.style.Style({
            image: new ol.style.Circle({
                radius: 5,
                fill: new ol.style.Fill({
                    color: 'rgba(0, 0, 255, 0.4)',
                }),
                stroke: new ol.style.Stroke({
                    color: 'rgba(0, 0, 255, 0.9)',
                    width: 1,
                })
            }),
            text: new ol.style.Text({
                font: 'bold 12px "Open Sans", "Arial Unicode MS", "sans-serif"',
                offsetX: 10,
                offsetY: -2,
                textAlign: 'left',
                textBaseline: 'center',
                fill: new ol.style.Fill({
                    color: 'rgba(0, 0, 255, 0.9)',
                }),
                stroke: new ol.style.Stroke({
                    color: 'white',
                    width: 4,
                }),
            }),
            zIndex:100,
        });
        const lineStyleBlue = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'rgba(0, 0, 255, 0.5)',
                width: 5,
            }),
            zIndex:100,
        });
        const lineStyleRed = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'rgba(255,0,0,0.7)',
                width: 7,
            }),
            zIndex:900,
        });
        const lineStyleGrey = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'rgb(10,170,170)',
                width: 5,
            }),
            zIndex:800,
        });
        const lineStyleNone = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'rgba(0, 0, 0, 0)',
                width: 0,
            }),
            zIndex:1,
        });
        const lineStyleGreen = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'rgba(1,224,1,0.6)',
                width: 6,
            }),
            zIndex:200,
        });
        let newLegsMapsLayer = new ol.layer.Vector({
            name: 'NewLegs',
            //no title , so wont show in layerswitcher
            source: newLegsData,
            style: function (feature) {
                if (feature.get('selected') === false) {
                    return APP.map.LegStyle;
                } else {
                    return APP.map.LegSelectedStyle;
                }
            }
        });
        let legsMapsLayer = new ol.layer.Vector({
            name: 'Legs',
            title: 'Legs', //title is needed for layerswitcher
            source: legsData,
            style: function (feature) {
                if (feature.get('selected') === false) {
                    return APP.map.LegStyle;
                } else {
                    return APP.map.LegSelectedStyle;
                }
            }
        });
        let journeysMapsLayer = new ol.layer.Vector({
            name: 'Journeys',
            title: 'Journeys', //title is needed for layerswitcher
            source: journeysData,
            style: function (feature) {
                if (feature.get('selected') === false) {
                    return APP.map.JourneyStyle;
                } else {
                    return APP.map.JourneySelectedStyle;
                }
            }
        });
        let stopsMapLayer = new ol.layer.Vector({
            name: 'Stops',
            title: 'Stops', //title is needed for layerswitcher
            source: stopsData,
            style: function (feature) {
                let styleUsed;
                if (mapName === 'ShowLegsMap') {
                    if (_mapView.getZoom() > 6) { // dont show stops until this zoom level
                        styleUsed = APP.map.StopStyle;
                        if (_mapView.getZoom() > 8) { // label
                            styleUsed.getText().setText(feature.get('name'));
                        } else { // no labels
                            styleUsed.getText().setText('');
                        }
                    } else {
                        styleUsed = stopStyleNone;
                    }

                } else { // for other map types always show stops
                    if (feature.get('selected') === true) {
                        styleUsed = APP.map.StopSelectedStyle;
                    } else {
                        styleUsed = APP.map.StopStyle;
                    }
                    if (_mapView.getZoom() > 7) { // label
                        styleUsed.getText().setText(feature.get('name'));
                    } else { // no labels
                        styleUsed.getText().setText('');
                    }
                }
                return styleUsed;
            },
        });
        let newStopsMapLayer = new ol.layer.Vector({
            name: 'NewStops',
            //no title , so wont show in layerswitcher
            source: newStopsData,
            style: function (feature) {
                let styleUsed;
                if (feature.get('selected') === true) {
                    styleUsed = APP.map.StopSelectedStyle;
                } else {
                    styleUsed = APP.map.StopStyle;
                }
                if (_mapView.getZoom() > 4) { // label
                    styleUsed.getText().setText(feature.get('name'));
                } else { // no labels
                    styleUsed.getText().setText('');
                }
                return styleUsed;
            },
        });
// add layers to map:
        _mapObj.addLayer(noBase);
        _mapObj.addLayer(osmLayer);
        _mapObj.addLayer(osmTransportLayer);
        _mapObj.addLayer(openRailwayMap);
        _mapObj.addLayer(legsMapsLayer);
        _mapObj.addLayer(journeysMapsLayer);
        _mapObj.addLayer(stopsMapLayer);
        _mapObj.addLayer(newLegsMapsLayer);
        _mapObj.addLayer(newStopsMapLayer);
// create a map view:
        _mapView = new ol.View({
            //center coords and zoom level:
            center: ol.proj.transform(startCoords, 'EPSG:4326', 'EPSG:3857'),
            minZoom: 2,
            maxZoom: 19,
            zoom: startZoom,
        });
        _mapObj.setView(_mapView);
        _mapObj.addControl(new ol.control.Zoom());
        if (showCoords) {
            const mousePositionControl = new ol.control.MousePosition({
                coordinateFormat: ol.coordinate.createStringXY(4),
                projection: 'EPSG:4326',
                undefinedHTML: '&nbsp;',
            });
            _mapObj.addControl(mousePositionControl);
        }
        const layerSwitcher = new ol.control.LayerSwitcher({
            tipLabel: 'LayerSwitcher', // Optional label for button
            groupSelectStyle: 'none' // Can be 'children' [default], 'group' or 'none'
        });
        _mapObj.addControl(layerSwitcher);
        _mapObj.on('pointermove', function (evt) {
            if (evt.dragging) {
                toolTipHide();
                return;
            }
            if (UI.showHover) MAP.displayFeatureInfo(_mapObj.getEventPixel(evt.originalEvent));
        });
        _mapObj.on('singleclick', onClickCallback);
        // window.onresize already works out of the box,
        // need this to also react to CSS #mapDiv resizing:
        const onresize = (dom_elem, callback) => {
            const resizeObserver = new ResizeObserver(() => callback());
            resizeObserver.observe(dom_elem);
        };
        onresize(document.getElementById('mapDiv'), function () {
            setTimeout(function () {
                _mapObj.updateSize();
            }, 200);
        });


        // FINALLY: return the map Object to be used in the APP object and further
        this.name = mapName;
        this.mapObj = _mapObj;
        this.mapView = _mapView;
        this.mapDraw = new ol.interaction.Draw({ // in the APP global so we can add and remove it in other places
            source: newLegsData,
            type: "LineString",
        });
        this.stopStyleNone = stopStyleNone;
        this.stopStyleBlue = stopStyleBlue;
        this.stopStyleRed = stopStyleRed;
        this.stopStyleRed = stopStyleGreen;
        this.lineStyleBlue = lineStyleBlue;
        this.lineStyleRed = lineStyleRed;
        this.lineStyleGreen = lineStyleGreen;
        this.lineStyleGrey = lineStyleGrey;
        this.lineStyleNone = lineStyleNone;
        return this;
    } // end MAP.init()
    ,
    displayLayer: function (layername, on = true) {
        this.mapObj.getLayers().getArray().find(layer => layer.get('name') === layername).setVisible(on);
    }
    ,
    displayFeatureInfo: function (pixel) {
        let features = [];
        this.mapObj.forEachFeatureAtPixel(pixel, function (feature, layer) {
            features.push({l: layer.get('name'), f: feature});
        });
        const total = features.length;
        const max = 3;
        if (total !== 0) {
            let popupHTML = '<table class="popup">';
            let count = 0;
            for (let i= total-1; i >= 0; i--) {
                if (features[i].l === 'Legs' || features[i].l === 'Stops' || features[i].l === 'Journeys')  {
                    count++;
                    if (count <= max) {
                        popupHTML += HTML.mapInfoPopup(features[i].l, features[i].f, count, total);
                    } else if (count === max + 1) {
                        popupHTML += '<tr><td colspan="2"><i>+ ' + (total - max) + ' more...</i></td></tr>';
                    }
                }
            }
            popupHTML += '</table>';
            UI.SetMessage(popupHTML, dataMsg, [pixel[0], pixel[1]]);
        } else {
            UI.SetMessage(' ', hideMsg, null);
        }
    }  //end MAP.displayFeatureInfo()
    ,
    zoomToBbox: function (osmBbox) {
        //takes in OSM bbox and zooms map to merc bbox
        if (osmBbox === undefined || osmBbox[0] > osmBbox[2]) {
            // no box, or invalid box, do not zoom
        } else {
            let ll = osm2merc([osmBbox[0], osmBbox[1]]);
            let ur = osm2merc([osmBbox[2], osmBbox[3]]);
            // console.log(ll[0], ll[1], ur[0], ur[1]);
            this.mapView.fit([ll[0], ll[1], ur[0], ur[1]], {padding: [40, 40, 40, 40]});
        }
    }
    ,
    idsFoundAtClick: function (evt) {
        let idsFound = [];
        let pixel = this.mapObj.getEventPixel(evt.originalEvent);
        this.mapObj.forEachFeatureAtPixel(pixel, function (feature) {
            idsFound.push(feature.get('id'));
        });
        return idsFound;
    }
    ,
    getLayerByName: function (theName) { //convenience function to get a single layer by name:
        let LA = this.mapObj.getAllLayers();
        for (let LL of LA) {
            if (LL.get('name') === theName) {
                return LL;
            }
        }
        return undefined;
    }
    ,
    getLayerDataByName: function (theName) { //convenience function to get a single layer by name:
        let LA = this.getLayerByName(theName);
        if (LA !== undefined) {
            return LA.get('source');
        }
        return undefined;
    }
    ,
    showFeatureOnMap: function (olFeature, layerName) { //map a single feature on layer:
        let layerData = this.getLayerDataByName(layerName);
        layerData.addFeature(olFeature);
    }
    ,
    changeClickCallback(oldClickCallback, newClickCallback) {
        this.mapObj.un('singleclick', oldClickCallback);
        this.mapObj.on('singleclick', newClickCallback);
    }
    ,
    getExtent() {
        return ol.proj.transformExtent(this.mapObj.getView().calculateExtent(this.mapObj.getSize()), 'EPSG:3857', 'EPSG:4326');
    }

} //end Map object