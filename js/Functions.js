/*-- **************************** -*/
/*-- Map Functions                -*/
/*-- **************************** -*/

/* --- INIT MAP  --- */
// startCoords, startzoom => starting lon, lat and zoom factor
// onClickFunction => callback for handling clicks in map
//
// TODO: parametrise myMap & MapView?
//
function initMap(startCoords, startZoom, onClickCallback) {
    myMap = new ol.Map({target: "mapDiv"});
    const osmLayer = new ol.layer.Tile({
        title: 'OSM Standard', //title is needed for layerswitcher
        type: 'base', //type is needed for layerswitcher
        source: new ol.source.OSM()
    });
    const noBase = new ol.layer.Tile({ //empty base layer for 'none'
        title: 'None', //title is needed for layerswitcher
        type: 'base', //type is needed for layerswitcher
    });
    const transportOSMKey = "d4674680716f4dc7b9e5228f66cd360c";
    const osmTransportLayer = new ol.layer.Tile({
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
        source : new ol.source.XYZ({
            attributions : [
                    ' <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>' ],
            url : 'https://{a-c}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
            crossOrigin: null, //make it work inside canvas
            tilePixelRatio: 2, //server returns 512px img for 256 tiles
            maxZoom: 19, // XYZ's default is 18
            opaque: true
        })
    });
    const emptyGeojsonLayer = {
        'type': 'FeatureCollection',
        'features': []
    };
    stopsData = new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(emptyGeojsonLayer)
    });
    newStopsData = new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(emptyGeojsonLayer)
    });
    newLegsData = new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(emptyGeojsonLayer)
    });
    legsData = new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(emptyGeojsonLayer)
    });
    const stopStyleRed = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: 'rgba(255, 0, 0, 0.4)',
            }),
            stroke: new ol.style.Stroke({
                color: 'rgba(255, 0, 0, 0.9)',
                width: 2,
            })
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
    });
    const stopStyleBlue = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({
                color: 'rgba(0, 0, 255, 0.4)',
            }),
            stroke: new ol.style.Stroke({
                color: 'rgba(0, 0, 255, 0.9)',
                width: 2,
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
    });
    const lineStyleBlue = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(0, 0, 255, 0.6)',
            width: 5,
        })
    });
    const lineStyleRed = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(255,0,0,0.6)',
            width: 7,
        })
    });
    const lineStyleGreen = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(17,116,41,0.6)',
            width: 5,
        })
    });
    let newLegsMapsLayer = new ol.layer.Vector({
        name: 'NewLegs',
        source: newLegsData,
        style: function (feature) {
            if (feature.get('selected') === false) {
                return lineStyleGreen;
            } else {
                return lineStyleRed;
            }
        }
    });
    let legsMapsLayer = new ol.layer.Vector({
        name: 'Legs',
        title: 'Legs', //title is needed for layerswitcher
        source: legsData,
        style: function (feature) {
            if (feature.get('selected') === false) {
                return lineStyleBlue;
            } else {
                return lineStyleRed;
            }
        }
    });
    let stopsMapLayer = new ol.layer.Vector({
        name: 'Stops',
        title: 'Stops', //title is needed for layerswitcher
        source: stopsData,
        style: function (feature) {
            let styleUsed;
            if (feature.get('selected') === true) {
                styleUsed = stopStyleRed;
            } else {
                styleUsed = stopStyleBlue;
            }
            if (mapView.getZoom() > 7) { // label
                styleUsed.getText().setText(feature.get('name'));
            } else { // no labels
                styleUsed.getText().setText('');
            }
            return styleUsed;
        },
    });
    let newStopsMapLayer = new ol.layer.Vector({
        name: 'NewStops',
        source: newStopsData,
        style: function (feature) {
            if (mapView.getZoom() > 3) { // label
                stopStyleRed.getText().setText(feature.get('name'));
            } else { // no labels
                stopStyleRed.getText().setText('');
            }
            return stopStyleRed;
        },
    });
// add layers to map:
    myMap.addLayer(noBase);
    myMap.addLayer(osmLayer);
    myMap.addLayer(osmTransportLayer);
    myMap.addLayer(openRailwayMap);
    myMap.getLayers().getArray().find(layer => layer.get('name') === 'openRailwayMap').setVisible(false);
    myMap.addLayer(legsMapsLayer);
    myMap.addLayer(stopsMapLayer);
    myMap.addLayer(newLegsMapsLayer);
    myMap.addLayer(newStopsMapLayer);
// create a map view:
    mapView = new ol.View({
        //center coords and zoom level:
        center: ol.proj.transform(startCoords, 'EPSG:4326', 'EPSG:3857'),
        minZoom: 2,
        maxZoom: 19,
        zoom: startZoom,
    });
    myMap.setView(mapView);
    myMap.addControl(new ol.control.Zoom());
    // const mousePositionControl = new ol.control.MousePosition({
    //     coordinateFormat: ol.coordinate.createStringXY(4),
    //     projection: 'EPSG:4326',
    //     undefinedHTML: '&nbsp;',
    // });
    // myMap.addControl(mousePositionControl);

    const layerSwitcher = new ol.control.LayerSwitcher({
        tipLabel: 'LayerSwitcher', // Optional label for button
        groupSelectStyle: 'none' // Can be 'children' [default], 'group' or 'none'
    });
    myMap.addControl(layerSwitcher);

    myMap.on('pointermove', function (evt) {
        if (evt.dragging) {
            toolTipHide();
            return;
        }
        if (UI.showHover) displayFeatureInfo(myMap.getEventPixel(evt.originalEvent));
    });
    myMap.on('singleclick', onClickCallback);
    draw = new ol.interaction.Draw({ // global so we can add and remove it in other places
        source: newLegsData,
        type: "LineString",
    });
    // window.onresize already works out of the box,
    // need this to also react to CSS #mapDiv resizing:
    const onresize = (dom_elem, callback) => {
        const resizeObserver = new ResizeObserver(() => callback() );
        resizeObserver.observe(dom_elem);
    };
    onresize(document.getElementById('mapDiv'), function () {
        setTimeout( function() { myMap.updateSize();}, 200);
    });
}

/*-- ****************************
     Generic function to take results of step x to query OSM and carry results to step x+1
     returns true if successful, or unsuccessful and "retry" is cancelled
     returns false if unsuccessful, and "retry" is chosen
/*-- **************************** -*/
async function getOSMandDoNextstep(query, outType, nextStepFunction, showIn) {
    let succes = false;
    UI.SetMessage("Querying OpenStreetMap...", workflowMsg);
    while (!succes) {
        let json = await queryOSM(query, outType);
        console.log(json);
        if (json.succes === false) {
            const messageStr ="Error querying OSM OverPass: [" + json.status + "] "
                + json.statusText + "\nDO YOU WANT TO RETRY...?";
            if (confirm(messageStr)) {
                console.log("Error: should retry");
                succes = false;
            } else {
                console.log("Error: should NOT retry");
                succes = true;
            }
        } else { //succces
            succes = true;
            document.body.style.cursor = "auto";
            UI.SetMessage("Ready querying OpenStreetMap.", workflowMsg);
            nextStepFunction(json, showIn);
        }
    }
}
async function queryOSM(query, outType) {
    document.body.style.cursor = "progress";
    //create a proper Overpass QL call:
    const OverPassUrl = "https://overpass-api.de/api/interpreter?data=";
    const jsonFormat = "[out:json];";
    // next will be the actual query from the input param query
    // this should ALWAYS have .finalresult as the output set:
    const outSet = ".finalresult";
    const outCmd = " out " + outType + ";";
    let url = OverPassUrl + jsonFormat + query + outSet + outCmd;
    // console.log(url);
    const response = await fetch(url);
    if (response.ok) { // if HTTP-status is 200-299
        // get the response body
        let json = await response.json();
        document.body.style.cursor = "auto";
        return json; // make function return true:
    } else {
        let jsonStr =  `{"succes": false, "status": ${response.status}, "statusText": "${response.statusText}" }`;
        let json = JSON.parse(jsonStr);
        document.body.style.cursor = "auto";
        return json; // make function return false
    }
}
/*-- **************************** -*/

/*-- **************************** -*/
/*-- STEP showStops function : Collect each Stop from OSM (because the relation did not have the stop names) -*/
/*-- and show them in a menu to choose from and create a "Construct" button: -*/
async function showStops(json, htmlElem) {
    legFrom = undefined;
    legTo = undefined;
    let numStops;
    if (json === undefined) {
        numStops = 0;
        UI.SetMessage("OSMRelation " + tmpOSMrelation.id + " (" + tmpOSMrelation.name + ") has no stops. Select a start and end stop from the existing ones and click the CONSTRUCT button...", workflowMsg);
        mapStops(allStops);
        // let stopsToggle = document.getElementById("toggleControl");
        // if (stopsToggle) {
        //     stopsToggle.style.display = "inline"; //show stops toggle
        //     myMap.getLayers().getArray().find(layer => layer.get('name') === 'Stops').setVisible(false); // hide layer first
        // }
    } else {
        let OSMstops = json.elements;
        numStops = OSMstops.length;
        UI.SetMessage("OSMRelation " + tmpOSMrelation.id + " (" + tmpOSMrelation.name + ") has " + numStops + " stops. Select a start and end stop and click the CONSTRUCT button...", workflowMsg);
        for (let stop of OSMstops) {
            // console.log(stop);
            let stopName = "undefined";
            if (stop.tags) {
                stopName = stop.tags.name;
            }
            tmpOSMrelation.stops.push(new Stop(stop.id, stopName, [stop.lon, stop.lat]));
        }
    }

    let showIn = document.getElementById(htmlElem);
    makeStopsMenu(showIn, numStops);

    // create construction button:
    let ConstructBtn = document.getElementById("action1Btn");
    ConstructBtn.value = 'CONSTRUCT LEG';
    ConstructBtn.style.display = "inline";
    ConstructBtn.addEventListener("click", function () {
        constructLeg(tmpOSMrelation.stops, stopFromID, stopToID, tmpOSMrelation.geometry.coordinates);
    });
    // create refreshStopsBtn:
    let refreshStopsBtn = document.getElementById("action2Btn");
    refreshStopsBtn.value = 'REFRESH Stops menus';
    refreshStopsBtn.style.display = "inline";
    refreshStopsBtn.addEventListener("click", async function () {
        allStops = await loadStopsFromDB(''); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
        mapStops(allStops);
        makeStopsMenu(showIn, numStops);
    });
    // create onclick events for rows:
    for (let stop of tmpOSMrelation.stops) {
        let row = document.getElementById("from_" + stop.id);
        row.addEventListener("click", function () {
            selectRelStop(0, stop.id);
        });
        row = document.getElementById("to_" + stop.id);
        row.addEventListener("click", function () {
            selectRelStop(1, stop.id);
        });
    }
}

// Create  dropdowm menu of stops currently in DB
function createStopsMenu(theStops, toOrFrom) {
    let htmlmenu = "<select id='menu_" + toOrFrom + "'";
    if (toOrFrom === "from") {
        htmlmenu += " onchange='selectDBStop(0,parseInt(this.value));' >";
    } else {
        htmlmenu += " onchange='selectDBStop(1,parseInt(this.value));' >";
    }
    htmlmenu += "<option value=''>--</option>";
    for (let aStop of theStops) {
        htmlmenu += `<option value="${aStop.id}">${aStop.name}</option>`;
    }
    htmlmenu += "</select>";
    return htmlmenu;
}

// Create  dropdowm <option> list of stops currently in DB
function createStopsOptions(theStops) {
    let htmloptions = "<option value=''>--</option>";
    for (let aStop of theStops) {
        htmloptions += `<option value="${aStop.id}">${aStop.name}</option>`;
    }
    return htmloptions;
}

// utility function to choose stop and show it on map
function selectDBStop(toOrFrom, stopId) {
    if (toOrFrom === 0) { //from
        stopFromID = stopId;
    } else { //to
        stopToID = stopId;
    }
    newStopsData.clear();
    for (let stop of allStops) {
        if (stop.id === stopFromID) {
            showFeatureOnMap(stop.toOlFeature(), newStopsData);
        }
        if (stop.id === stopToID && stopToID !== stopFromID) {
            showFeatureOnMap(stop.toOlFeature(), newStopsData);
        }
    }
}

// utility function to choose stop from selected Relation
function selectRelStop(toOrFrom, stopId) {
    if (toOrFrom === 0) { //from
        stopFromID = stopId;
    } else { //to
        stopToID = stopId;
    }
    newStopsData.clear();
    for (let stop of tmpOSMrelation.stops) {
        if (stop.id === stopFromID) {
            showFeatureOnMap(stop.toOlFeature(), newStopsData);
        }
        if (stop.id === stopToID) {
            showFeatureOnMap(stop.toOlFeature(), newStopsData);
        }
    }
}
//Waiting for choices and CONSTRUCT btn click to start next step
/*-- End of STEP showSTops -*/
/*-- **************************** -*/

function makeStopsMenu(showIn, numStopsInRel) {
    // mapStops(allStops);
    if (numStopsInRel === 0) { // no stops from Relation, use existing DB stops
        showIn.innerHTML = HTML.showChooseDBStopsForm(
            createStopsMenu(allStops, 'from'),
            createStopsMenu(allStops, 'to'));
    } else { // also need to use (new) Relation Stops:
        let toStopsHtml = "", fromStopsHtml = "";
        //Create START and END rows, and draw the OSMstops on the map:
        for (let stop of tmpOSMrelation.stops) {
            //create table rows:
            fromStopsHtml += "<tr class='selector' id=" + "from_" + stop.id + ">";
            toStopsHtml += "<tr class='selector' id=" + "to_" + stop.id + ">";
            fromStopsHtml += "<td>" + stop.id + "</td>";
            toStopsHtml += "<td>" + stop.id + "</td>";
            fromStopsHtml += "<td>" + stop.name + "</td>";
            toStopsHtml += "<td>" + stop.name + "</td>";
            fromStopsHtml += "</tr>";
            toStopsHtml += "</tr>";
            // draw it in the map:
            showFeatureOnMap(stop.toOlFeature(), stopsData);
        }
        showIn.innerHTML = HTML.showChooseStopsForm(fromStopsHtml, toStopsHtml,
            createStopsMenu(allStops, 'from'),
            createStopsMenu(allStops, 'to'));
    }
}


/*-- **************************** -*/

function toggleLegsLayer() {
    let legsLayer = myMap.getLayers().getArray().find(layer => layer.get('name') === 'Legs');
    if (legsLayer.getVisible() === false) {
        legsLayer.setVisible(true)
    } else {
        legsLayer.setVisible(false)
    }
}

function toggleStopsLayer() {
    let stopsLayer = myMap.getLayers().getArray().find(layer => layer.get('name') === 'Stops');
    if (stopsLayer.getVisible() === false) {
        stopsLayer.setVisible(true)
    } else {
        stopsLayer.setVisible(false)
    }
}

function toggleORMLayer() {
    let ORMLayer = myMap.getLayers().getArray().find(layer => layer.get('name') === 'openRailwayMap');
    if (ORMLayer.getVisible() === false) {
        ORMLayer.setVisible(true)
    } else {
        ORMLayer.setVisible(false)
    }
}

// returns them as an array of objects of class Leg (see Models.js)
async function loadLegsFromDB(where) {
    let legsFound = [];
    let loadedLeg = undefined;
    let postUrl = '/legs?';
    postUrl += 'select=id,name,startdatetime,enddatetime,notes,type,stopfrom(id,name,geojson),stopto(id,name,geojson),geojson';
    postUrl += '&order=startdatetime.desc.nullslast&' + where;
    // console.log(postUrl);
    let resultJSON = undefined;
    resultJSON = await DB.query("GET", postUrl);
    if (resultJSON.error === true) {
        DB.giveErrorMsg(resultJSON);
    } else {
        for (let legfound of resultJSON.data) {
            if (legfound.geojson === null || legfound.geojson === undefined) {
                UI.SetMessage('Skipped Leg object without valid geojson: ' + legfound.id, workflowMsg);
            } else {
                loadedLeg = new Leg(legfound.id, legfound.name, undefined, legfound.stopfrom, legfound.stopto,
                    legfound.startdatetime, legfound.enddatetime, legfound.notes, legfound.type);
                loadedLeg.selected = false;
                loadedLeg.geometry = legfound.geojson;
                loadedLeg.bbox = calcBbox(legfound.geojson.coordinates);
                legsFound.push(loadedLeg);
                loadedLeg = undefined;
            }
        }
        UI.SetMessage(legsFound.length + " existing Legs loaded from DB.", workflowMsg);
        return legsFound;
    }
}

// returns them as an array of type names (array index = type id)
async function loadTypesFromDB(where) {
    let typesFound = [];
    legTypesMenu = ''; // global html code for pulldown
    let postUrl = '/types?';
    postUrl += 'select=id,name';
    postUrl += '&order=id&' + where;
    // console.log(postUrl);
    let resultJSON = undefined;
    resultJSON = await DB.query("GET", postUrl);
    if (resultJSON.error === true) {
        DB.giveErrorMsg(resultJSON);
    } else {
        legTypesMenu += '<select id="leg_type_select" name="leg_type_select">';
        for (let typeFound of resultJSON.data) {
            typesFound.push(typeFound.name);
            legTypesMenu += '<option value=' + typeFound.id + '>' + typeFound.name + '</option>';
        }
        legTypesMenu += '</select>';
        UI.SetMessage(typesFound.length + " types loaded from DB.", workflowMsg);
                return typesFound;
    }

}

function mapLegs(Legs, showStops = true, dataLayer = legsData) {
    if (showStops) stopsData.clear();
    dataLayer.clear();
    for (let aLeg of Legs) {
        showFeatureOnMap(aLeg.toOlFeature(), dataLayer);
        if (showStops) {
            let aStopFrom = new Stop(aLeg.stopFrom.id, aLeg.stopFrom.name, aLeg.stopFrom.geojson.coordinates);
            showFeatureOnMap(aStopFrom.toOlFeature(), stopsData);
            let aStopTo = new Stop(aLeg.stopTo.id, aLeg.stopTo.name, aLeg.stopTo.geojson.coordinates);
            showFeatureOnMap(aStopTo.toOlFeature(), stopsData);
        }
    }
}

function mapStops(Stops, dataLayer = stopsData) {
    dataLayer.clear();
    for (let aStop of Stops) {
        showFeatureOnMap(aStop.toOlFeature(), dataLayer);
    }
}

let displayFeatureInfo = function (pixel) {
    let feature = myMap.forEachFeatureAtPixel(pixel, function (feature) {
        return feature;
    });
    if (feature) {
        UI.SetMessage(feature.get('name'), dataMsg, [pixel[0] , pixel[1] ] );
    } else {
        toolTipHide();
    }
};

function idsFoundAtClick(pixel) {
    let idsFound = [];
    let feature = myMap.forEachFeatureAtPixel(pixel, function (feature) {
        idsFound.push(feature.get('id'));
    });
    return idsFound;
};

//zoom to bbox of set of objects that have a BBox:
function zoomToLegs(zoomtoAll = true) {
    let warnings = 0;
    let bboxChanged = false;
    let minlat = 90;
    let minlon = 180;
    let maxlat = -90;
    let maxlon = -180;
    for (let aLeg of allLegs) {
        if (aLeg.bbox) {
            if (zoomtoAll || aLeg.selected) {
                bboxChanged = true;
                if (aLeg.bbox[0] < minlat) minlat = aLeg.bbox[0];
                if (aLeg.bbox[1] < minlon) minlon = aLeg.bbox[1];
                if (aLeg.bbox[2] > maxlat) maxlat = aLeg.bbox[2];
                if (aLeg.bbox[3] > maxlon) maxlon = aLeg.bbox[3];
            }
        } else {
            warnings++;
        }
    }
    // console.log([minlat, minlon, maxlat, maxlon]);
    if (bboxChanged) zoomMapToBbox([minlat, minlon, maxlat, maxlon]);
    if (warnings !== 0) UI.SetMessage("WARNING: ' + warnings + ' objects have no (valid) BBOX!", errorMsg);
}

function zoomMapToBbox(osmBbox) {
    //takes in OSM bbox and zooms map to merc bbox
    let ll = osm2merc([osmBbox[0], osmBbox[1]]);
    let ur = osm2merc([osmBbox[2], osmBbox[3]]);
    // console.log(ll[0], ll[1], ur[0], ur[1]);
    mapView.fit([ll[0], ll[1], ur[0], ur[1]], {padding: [40, 40, 40, 40]});
}

function showOsmBboxOnMap(osmBbox, mapLayer) {
    // first puts osmBbox Str "(x1,y1,x2,y2)" into array:
    let bboxArray = osmBbox.substring(osmBbox.indexOf('(') + 1, osmBbox.indexOf(')'));
    bboxArray = bboxArray.split(',');
    // recalculate OSM style bbox to lonLat MultiLineString [ [[lon,lat],[lon,lat]],[...]]
    let llMultiline = [];
    let llLine = [];
    llLine.push(osm2ll([bboxArray[0], bboxArray[1]])); // ll
    llLine.push(osm2ll([bboxArray[0], bboxArray[3]])); // ul
    llLine.push(osm2ll([bboxArray[2], bboxArray[3]])); //ur
    llLine.push(osm2ll([bboxArray[2], bboxArray[1]])); //lr
    llLine.push(osm2ll([bboxArray[0], bboxArray[1]])); // ll again to close
    llMultiline.push(llLine)
    // convert to proper GeoJSON MultiLineString:
    let mercLineString = new ol.geom.MultiLineString(llMultiline).transform('EPSG:4326', 'EPSG:3857');
    let olFeature = new ol.Feature({
        geometry: mercLineString,
        id: 0,
        name: "searchBox",
    });
    showFeatureOnMap(olFeature, mapLayer);
}

function showClickOnMap(clickLoc, mapLayer) {
    // convert to proper GeoJSON Point:
    let mercPnt = new ol.geom.Point(clickLoc);
    let olFeature = new ol.Feature({
        geometry: mercPnt,
        id: 1,
        name: "",
    });
    showFeatureOnMap(olFeature, mapLayer);
}


function showFeatureOnMap(olFeature, mapLayer) {
    mapLayer.addFeature(olFeature);
}

function showTmpLegOnMap(geom) {
    newLegsData.clear();
    let tmpID = 777777;
    let tmpLeg = undefined;
    tmpLeg = new Leg(tmpID, 'tmpLeg', geom, undefined, undefined, undefined,
        undefined, undefined, 0);
    tmpLeg.bbox = calcBbox(tmpLeg.geometry.coordinates);
    showFeatureOnMap(tmpLeg.toOlFeature(), newLegsData);
    zoomMapToBbox(tmpLeg.bbox);
}


/*-- ********************************** -*/
/*-- Various Spatial Utility Functions  -*/
/*-- ********************************** -*/


//takes to coordinate pairs c1 and c2 and returns true if they're equal.
function isEqual(c1, c2) {
    if (c1 !== undefined && c2 !== undefined) {
        if (c1[0] === c2[0] && c1[1] === c2[1]) {
            return true;
        }
    }
    return false;
}

// find two coords in a LineString and returns the part of the Linestring that is between them
// now using Turf.js to also find slices when stop is not exactly on line:
function extractLegFromLine(geom, firstCoordToFind, secCoordToFind) {
    let t_line = turf.lineString(geom);
    let t_start = turf.point(firstCoordToFind);
    let t_stop = turf.point(secCoordToFind);
    let t_sliced = turf.lineSlice(t_start, t_stop, t_line);
    // console.log("LS => leg:");
    // console.log(t_sliced.geometry.coordinates);
    return t_sliced.geometry.coordinates;
}


// takes a (possibly) unordered MultiLineString (from an OSMrelation) and
// returns 1 Linestring, ordered from start to end, and without duplicate coords
// This version is using JSTS LineMerger:
//
function extractLineFromMultiline(geom, automatic = true) {
    const jsts_reader = new jsts.io.GeoJSONReader();
    const jsts_writer = new jsts.io.GeoJSONWriter();
    const jsts_lineMerger = new jsts.operation.linemerge.LineMerger();
    for (let line of geom) {
        let GeoJSONline = turf.lineString(line).geometry;
        let aLine = jsts_reader.read(GeoJSONline);
        jsts_lineMerger.add(aLine);
    }
    // let JSTS try the merge:
    jsts_lineMerger.merge();
    const mergedLineStrings = jsts_lineMerger.getMergedLineStrings();
    // depending on the results...
    if (mergedLineStrings.array.length === 1) { // Merge into 1 line successful, as happens in "normal" routes
        //return the merged string geom
        return jsts_writer.write(mergedLineStrings.get(0)).coordinates;

    } else if (mergedLineStrings.array.length < 1) { // No success at all, abort
        UI.SetMessage('Merging multiLineString rendered no useful LineString.', errorMsg);
        if (automatic) { // give up
            UI.SetMessage('Aborted, no Leg created.', workflowMsgMsg);
            return undefined;
        } else { // return original geom and try again...
            return undefined;
        }

    } else if (mergedLineStrings.array.length > 1) {
        // ***********
        // More linestrings found, have to manually
        // choose a set that will be used to create linestring Merge
        let messageStr = "This route contains multiple line segments, which cannot be automatically merged.\n";
        if (automatic) { // give up automatic - try manually
            messageStr += "You can try to create a Leg 'manually' using the appropriate tool.\n";
            messageStr += "If you click OK, you will be transferred there, with the current OSMrelationID [" + tmpOSMrelation.id + "] preset...";
            if (confirm(messageStr)) {
                const curCenter = ol.proj.transform(mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
                const curZoom = mapView.getZoom();
                window.location = "./createLegManually.html?id=" + tmpOSMrelation.id + "&start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
            } else {
                return undefined;
            }
        } else { // return and try again...
            messageStr += "Re-try with different selection...";
            alert(messageStr);
            return undefined;
        }

    } else {
        UI.SetMessage('Unexpected error using JSTS LineMerger.', errorMsg);
        UI.SetMessage('Aborted, no Leg created.', workflowMsgMsg);
        return undefined;
    }
}

/*-- End of extractLineFromMultiline() -*/


// ***********
// More linestrings found, first do merge as far as possible automatically,
// the go to manual editing for final merge
// ***********
function showMergedParts(geom, preMerge) {
    if (preMerge) { // try to collect merged parts first from JSTS
        const jsts_reader = new jsts.io.GeoJSONReader();
        const jsts_writer = new jsts.io.GeoJSONWriter();
        const jsts_lineMerger = new jsts.operation.linemerge.LineMerger();
        for (let line of geom) {
            let GeoJSONline = turf.lineString(line).geometry;
            let aLine = jsts_reader.read(GeoJSONline);
            jsts_lineMerger.add(aLine);
        }
        // let JSTS try the merge:
        jsts_lineMerger.merge();
        const mergedLineStrings = jsts_lineMerger.getMergedLineStrings();
        const linesFound = mergedLineStrings.array.length;
        if (linesFound > 1) {
            /// THIS IS NOW THE EXPECTED CASE !!!
            allLegs = [];
            for (let i = 0; i < linesFound; i++) {
                showLineUnderConsideration(jsts_writer.write(mergedLineStrings.get(i)).coordinates, i);
            }
        } else {
            UI.SetMessage('Unexpected error in showMergedParts().', errorMsg);
            UI.SetMessage('Aborted, no Leg created.', workflowMsgMsg);
            return undefined;
        }
    } else { // offer all seperate route Ways as parts
        allLegs = [];
        let i = 0;
        for (let line of geom) {
            showLineUnderConsideration(line, i);
            i++;
        }

    }
}

function showLineUnderConsideration(geom, index) {
    let tmpID = index;
    let tmpLeg = undefined;
    let tmpLegName = 'part_' + index;
    tmpLeg = new Leg(tmpID, tmpLegName, geom, undefined, undefined, undefined,
        undefined, undefined, 0);
    tmpLeg.selected = false;
    tmpLeg.bbox = calcBbox(tmpLeg.geometry.coordinates);
    allLegs.push(tmpLeg);
    showFeatureOnMap(tmpLeg.toOlFeature(), newLegsData);
}


function findStopCoords(stopId, stops) {
    let coordsFound;
    let foundOne = 0;
    for (let stop of stops) {
        if (stop.id === stopId) {
            // stopsCoordsOrdered.push(stop);
            coordsFound = stop.geometry.coordinates;
            foundOne++;
        }
    }
    if (foundOne === 0 || foundOne > 1) {
        return 0;
    } else {
        return coordsFound;
    }
}

// takes a Line element with descriptors and reverses/flips it fully
function flipLine(line) {
    line.geom = reverseLineGeom(line.geom);
    tmpInd = line.linkStartInd;
    tmpWhere = line.linkStartWhere;
    line.linkStartInd = line.linkEndInd;
    line.linkStartWhere = line.linkEndWhere;
    line.linkEndInd = tmpInd;
    line.linkEndWhere = tmpWhere;
    return line;
}

// takes a line geom and reverses its direction
function reverseLineGeom(geom) {
    let reversedGeom = [];
    for (let i = 0; i < geom.length; i++) {
        reversedGeom[i] = geom[geom.length - 1 - i];
    }
    return reversedGeom;
}

//calculate OSM style bbox from set of array of coords in [lon,lat]:
function calcBbox(coords) {
    let minlat = 90;
    let minlon = 180;
    let maxlat = -90;
    let maxlon = -180;
    for (let lonlat of coords) {
        let lon = lonlat[0];
        let lat = lonlat[1];
        if (lat < minlat) minlat = lat;
        if (lat > maxlat) maxlat = lat;
        if (lon < minlon) minlon = lon;
        if (lon > maxlon) maxlon = lon;
    }
    // console.log([minlat, minlon, maxlat, maxlon]);
    return [minlat, minlon, maxlat, maxlon];
}


// switch from lon,lat to lat,lon
function ll2osm(coord) {
    return [coord[1], coord[0]];
}

// switch from lat,lon to lon,lat
function osm2ll(coord) {
    return [coord[1], coord[0]];
}

// transform lon,lat to Gmercator x,y
function ll2merc(coord) {
    return ol.proj.transform(coord, 'EPSG:4326', 'EPSG:3857');
}

// transform Gmercator x,y to lon,lat
function merc2ll(coord) {
    return ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326');
}

// change lat,lon to lon,lat and then transform to Gmercator x,y
function osm2merc(coord) {
    coord = [coord[1], coord[0]];
    return ol.proj.transform(coord, 'EPSG:4326', 'EPSG:3857');
}

// transform Gmercator to lon,lat and then change lon,lat to lat,lon
function merc2osm(coord) {
    coord = ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326');
    return [coord[0], coord[1]];
}


/*-- **************************** -*/
/*-- User Interface Functions  -*/
/*-- **************************** -*/

function reuseDateTime() {
    let reuseDateTime;
    const theStr = "Do you want to copy the date & time from the original...?";
    if (confirm(theStr)) {
        return true;
    } else {
        return false;
    }
}


/*-- **************************** -*/
/*-- Various Utility Functions  -*/
/*-- **************************** -*/

//+++++++++++++++++++++++++++++++++++++++++++++++++++
// changes the WHERE statement in a PG_REST call based on choices from HTML Forms
// expects colNames: an array of column names in the Form (and the corresponding DB Table):
// ["id", "name", etc...]
// Does NOT return anything - but SETS the GLOBAL theWhereStr (tb used by HTML form submissions)
function changePGRESTWhere(colNames) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    theWhereStr = ""; // needs to be a global, cause various async Form submissions use it...
    let theAndOr = document.getElementById("and_or").value;
    for (let theColName of colNames) {
        let theCol = document.getElementById("col_" + theColName).value;
        let theOp = document.getElementById("op_" + theColName).value;
        if (theCol !== "") {
            if (theOp === "equals") {
                theWhereStr += theColName + ".ilike." + theCol + ",";
            } else if (theOp === "contains") {
                theWhereStr += theColName + ".ilike.*" + theCol + "*,";
            } else if (theOp === "beginswith") {
                theWhereStr += theColName + ".ilike." + theCol + "*,";
            } else if (theOp === "endswith") {
                theWhereStr += theColName + ".ilike.*" + theCol + ",";
            } else if (theOp === "=") {
                theWhereStr += theColName + ".eq." + theCol + ",";
            } else if (theOp === "<") {
                theWhereStr += theColName + ".lt." + theCol + ",";
            } else if (theOp === ">") {
                theWhereStr += theColName + ".gt." + theCol + ",";
            } else if (theOp === "<>") {
                theWhereStr += theColName + ".neq." + theCol + ",";
            } else if (theOp === "on") {
                theWhereStr += theColName + ".eq." + theCol + ",";
            } else if (theOp === "before") {
                theWhereStr += theColName + ".lt." + theCol + ",";
            } else if (theOp === "after") {
                theWhereStr += theColName + ".gt." + theCol + ",";
            } else {
                UI.SetMessage("Unknown Operator in function changeWhere()...!", errorMsg);
            }
        }
    }
    if (theWhereStr !== '') {
        theWhereStr = theAndOr + "=(" + theWhereStr;
        theWhereStr = theWhereStr.substring(0, theWhereStr.length - 1); // remove , from last one...
        theWhereStr += ")";
    }
}


function showSaveLegForm(theLeg, htmlElem, comingFrom) {
    UI.resetActionBtns();
    UI.SetMessage("Edit properties and save...", workflowMsg);
    let showIn = document.getElementById(htmlElem);
    const tmpGEOJSON = JSON.stringify(theLeg.geometry);
    // if dates are NULL in DB, show them as empty string in form;
    if (theLeg.startDateTime === null || theLeg.startDateTime === 'null') theLeg.startDateTime = '';
    if (theLeg.endDateTime === null|| theLeg.endDateTime === 'null') theLeg.endDateTime = '';
    /*-- Submit of this Form will trigger STEP 10  -*/
    showIn.innerHTML = HTML.saveLegForm(theLeg);
    document.getElementById("leg_type_select").selectedIndex = theLeg.type;
    let SaveBtn = document.getElementById("SaveBtn");
    SaveBtn.value = 'SAVE LEG IN DB';
    SaveBtn.addEventListener("click", function () {
        saveLegInDB(theLeg, comingFrom);
    });
    let CancelBtn = document.getElementById("CancelBtn");
    CancelBtn.addEventListener("click", function () {
        if (comingFrom === 'constructleg' ) {
            document.getElementById("workflow").innerHTML = '';
            UI.resetActionBtns();
            newLegsData.clear();
            const curCenter = ol.proj.transform(mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
            const curZoom = mapView.getZoom();
            window.location = "./constructleg.html?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
            UI.SetMessage("Cancelled. Start by selecting an OSM relation in the map...", workflowMsg);
        } else if (comingFrom === 'mergelegs' || comingFrom === 'returnleg'
            || comingFrom === 'copyleg'  || comingFrom === 'truncateleg') {
            selectNoLegs();
            newLegsData.clear();
            UI.resetActionBtns();
            UI.SetMessage("Cancelled. Click in map or table to alter selection...", workflowMsg);
            searchLegs(theWhereStr); // redo orignal search
        } else if (comingFrom === 'createLegManually') {
            document.getElementById("workflow").innerHTML = '';
            UI.resetActionBtns();
            newLegsData.clear();
            UI.SetMessage("Cancelled.", workflowMsg);
            const curCenter = ol.proj.transform(mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
            const curZoom = mapView.getZoom();
            if (tmpOSMrelation.id) {
                window.location = "./createLegManually.html?id=" + tmpOSMrelation.id + "&start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
            } else {
                window.location = "./createLegManually.html?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
            }
        } else if (comingFrom === 'drawingleg') {
            document.getElementById("workflow").innerHTML = '';
            UI.resetActionBtns();
            newLegsData.clear();
            UI.SetMessage("Cancelled.", workflowMsg);
            const curCenter = ol.proj.transform(mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
            const curZoom = mapView.getZoom();
            window.location = "./drawleg.html?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
        } else {
            UI.SetMessage("UNEXPECTED ERROR: 'comingFrom' undefined in showSaveLegForm()", errorMsg);
            UI.SetMessage("Cancelled. ", workflowMsg);
        }
    });
}

async function saveLegInDB(theLeg, comingFrom) {
    theLeg.startDateTime = document.getElementById("leg_startdatetime").value;
    theLeg.endDateTime = document.getElementById("leg_enddatetime").value;
    theLeg.name = escapeStr(document.getElementById("leg_name").value);
    theLeg.notes = escapeStr(document.getElementById("leg_notes").value);
    theLeg.type = document.getElementById("leg_type_select").value;
    // console.log(theLeg);
    let fromStopIsNew = await DB.addStopIfNew(theLeg.stopFrom);
    let toStopIsNew = await DB.addStopIfNew(theLeg.stopTo);
    let legAdded = await DB.addLeg(theLeg);
    if (legAdded) {
        UI.SetMessage("Saved Leg in DB.", workflowMsg);
        if (comingFrom === 'constructleg' || comingFrom === 'createLegManually') {
            document.getElementById("workflow").innerHTML = '';
            UI.resetActionBtns();
            newStopsData.clear();
            newLegsData.clear();
            const curCenter = ol.proj.transform(mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
            const curZoom = mapView.getZoom();
            window.location = "./constructleg.html?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
        } else if (comingFrom === 'mergelegs' || comingFrom === 'returnleg' || comingFrom === 'copyleg'
            || comingFrom === 'truncateleg') {
            document.getElementById("workflow").innerHTML = '';
            UI.resetActionBtns();
            newStopsData.clear();
            newLegsData.clear();
            searchLegs(theWhereStr); // redo original search
            // const curCenter = ol.proj.transform(mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
            // const curZoom = mapView.getZoom();
            // window.location = "./showlegs.html?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
        } else if (comingFrom === 'drawingleg') {
            document.getElementById("workflow").innerHTML = '';
            UI.resetActionBtns();
            const curCenter = ol.proj.transform(mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
            const curZoom = mapView.getZoom();
            window.location = "./showlegs.html?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
        } else {
            UI.SetMessage("UNEXPECTED ERROR: 'comingFrom' undefined in saveLegInDB()", errorMsg);
            window.location = "./index.html";
        }

    }
}

function getParameterByName(name) {
    // name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    let regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(window.location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

// to escape quotes, tabs, newlines in strings and text fields to be able to be JSON.parsed
function escapeStr(theStr) {
    if (theStr === undefined || theStr === null) {
        theStr = "";
    }
    let re = /'/g;
    Str = theStr.replace(re, "\'");
    re = /"/g;
    Str = Str.replace(re, "\'");
    re = /\n/g;
    Str = Str.replace(re, "\\n");
    return Str;
}

// returns them as an array of objects of class Stop (see Models.js)
async function loadStopsFromDB(where) {
    let stopsFound = [];
    let newStop = undefined;
    let postUrl = '/stops?';
    postUrl += 'select=id,name,geojson';
    postUrl += '&order=name.asc&' + where;
    // console.log(postUrl);
    let resultJSON = undefined;
    resultJSON = await DB.query("GET", postUrl);
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
        return stopsFound;
    }
}


/*-- END of utility functions -*/