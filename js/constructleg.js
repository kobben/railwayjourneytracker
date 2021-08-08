//Globals:
let myMap, mapView;
let legsMapData, stopsMapData, legFrom, legTo;
let myOSMrelation, myLeg; // create one global version

/*-- Initialization function --*/
function init() {
    InitMessages("appDiv", true);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (DB.init('http://localhost:3000', authToken)) {
        SetMessage("Initializing leg construction...", workflowMsg);
        let startAt = getParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            initMap(startAt[0], startAt[1], startAt[2]); //loc from params
        } else {
            initMap(6.89, 52.22, 11); //Enschede
        }

        DEBUG = mapView;
        SetMessage("Start by selecting an OSM relation in the map...", workflowMsg);
        // step 1 done, waiting for mapclick to trigger step 2...
    } else {
        SetMessage("Could not initialise DB connection.", errorMsg);
    }
}

/*-- end of init -*/

/*-- **************************** -*/
/*-- Workflow/Interactivity Steps:-*/
/*-- **************************** -*/

/*-- **************************** -*/
/*-- Generic function to take results of step x to query OSM and carry results to step x+1:   -*/
/*-- **************************** -*/
async function getOSMandDoNextstep(query, outType, nextStepFunction, showIn) {
    SetMessage("Querying OpenStreetMap...", workflowMsg);
    document.body.style.cursor = "progress";
    //create a proper Overpass QL call:
    const OverPassUrl = "https://overpass-api.de/api/interpreter?data=";
    const jsonFormat = "[out:json];";
    // next will be the actual query from the input param query
    // this should ALWAYS have .finalresult as the output set:
    const outSet = ".finalresult";
    const outCmd = " out " + outType + ";";
    let url = OverPassUrl + jsonFormat + query + outSet + outCmd;
    let response = await fetch(url);
    if (response.ok) { // if HTTP-status is 200-299
        // get the response body
        let json = await response.json();
        SetMessage("Ready querying OpenStreetMap.", workflowMsg);
        document.body.style.cursor = "auto";
        nextStepFunction(json, showIn);
        // console.log(json);
    } else {
        SetMessage("Error querying OSM OverPass :\n[" + response.status + "] " + response.statusText, errorMsg);
        SetMessage('Aborted OSM querying.', workflowMsg);
        document.body.style.cursor = "auto";
    }
}

/*-- End of getOSMandDoNextstep  -*/


/*-- STEP 1: Initialise OSM map and wait for mapClick to choose OSMRelation  -*/
function initMap(startlon,startlat,startZoom) {
    const startLocation = []; startLocation[0] = startlon; startLocation[1] = startlat;
    //define map object & link to placeholder div:
    myMap = new ol.Map({target: "mapDiv"});

    const transportOSMKey = "d4674680716f4dc7b9e5228f66cd360c";
    const osmTransportLayer = new ol.layer.Tile({
        source: new ol.source.OSM({
            attributions: [
                'Background: ©<a href="https://www.thunderforest.com/">OSM Transport</a>'],
            url:
                'https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + transportOSMKey,
        }),
    });

    const emptyGeojsonLayer = {
        'type': 'FeatureCollection',
        'features': []
    };
    stopsMapData = new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(emptyGeojsonLayer)
    });
    legsMapData = new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(emptyGeojsonLayer)
    });

    const stopStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
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
            // backgroundFill: new ol.style.Fill({
            //     color: 'white',
            // }),
        }),
    });
    const lineStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(0, 0, 255, 0.6)',
            width: 5,
        })
    });

    let legsMapsLayer = new ol.layer.Vector({
        name: 'Lines',
        source: legsMapData,
        style: lineStyle,
    });
    let stopsMapLayer = new ol.layer.Vector({
        name: 'Stops',
        source: stopsMapData,
        style: function (feature) {
            stopStyle.getText().setText(feature.get('name'));
            return stopStyle;
        },
    });

// add layers to map:
    myMap.addLayer(osmTransportLayer);
    myMap.addLayer(stopsMapLayer); //will start out empty...
    myMap.addLayer(legsMapsLayer); //will start out empty...

// create a map view:
    mapView = new ol.View({
        //center coords and zoom level:
        center: ol.proj.transform(startLocation, 'EPSG:4326', 'EPSG:3857'),
        minZoom: 2,
        maxZoom: 19,
        zoom: startZoom,
    });
    myMap.setView(mapView);

    myMap.addControl(new ol.control.Zoom());
    const mousePositionControl = new ol.control.MousePosition({
        coordinateFormat: ol.coordinate.createStringXY(4),
        projection: 'EPSG:4326',
        undefinedHTML: '&nbsp;',
    });
    myMap.addControl(mousePositionControl);
    myMap.on('pointermove', function (evt) {
        if (evt.dragging) {
            toolTipHide();
            return;
        }
        displayFeatureInfo(myMap.getEventPixel(evt.originalEvent));
    });
    myMap.on('singleclick', mapClick); //(evt) will be handed over to STEP 2...
}

/*-- End of STEP 1  -*/

/*-- STEP 2: map was clicked, check which OSMRelations are near  -*/
function mapClick(evt) {
    //first remove stops & lines if they are shown:
    stopsMapData.clear();
    legsMapData.clear();
    let curZoom = mapView.getZoom();
    resetActionBtns();
    if (curZoom <= 7) {
        SetMessage("Zoom in more to select routes!", workflowMsg);
        // console.log("zoom in more to select routes!");
    } else {
        let mercClicked = evt.coordinate;
        let osmClicked = merc2osm(mercClicked);
        const searchSizeBase = 2.000;
        // base = 2 works out same ca 7 pixels width (square only at equator) in all zoom levels
        // searchsize in degrees at zoomlevel 1,  halfs for every zoom step down:
        let searchSizeLon = searchSizeBase / (2 ** (curZoom - 1));
        // compensate for mercator distortion, very approx. gets square on Mid European latitudes
        let searchSizeLat = searchSizeLon * 0.6666;
        let osmBbox = "(" + (osmClicked[0] - searchSizeLat) + "," + (osmClicked[1] - searchSizeLon) + "," +
            (osmClicked[0] + searchSizeLat) + "," + (osmClicked[1] + searchSizeLon) + ")";
        showOsmBboxOnMap(osmBbox, legsMapData);
        // query should ALWAYS have .finalresult as the output set:
        let query = '(';
        query += 'rel["route"~"train",i] ' + osmBbox + ';'
        query += 'rel["route"~"rail",i] ' + osmBbox + ';'
        query += ')';
        query += '->.finalresult;';
        // console.log(query);
        getOSMandDoNextstep(query, "body", showFoundRelations, "workflow");
    }
}

/*-- End of STEP 2  -*/

/*-- STEP 3: List the OSMrelations found and let the user choose one  -*/
function showFoundRelations(json, htmlElem) {
    const mainKeys = ["ref", "name", "from", "to"];
    let showIn = document.getElementById(htmlElem);
    let html = "";
    let numRelations = json.elements.length;
    if (numRelations === 0) {
        html = "<h4>No relations found...</h4>";
        showIn.innerHTML = html;
    } else {
        SetMessage("Found " + numRelations + " relations. Select the relation you want to use...", workflowMsg);
        html += "<table class='selector'>";
        //header:
        html += "<tr>";
        for (let tagKey of mainKeys) {
            html += "<th class='selector'>" + tagKey + "</th>";
        }
        html += "<th class='selector'>" + "other tags" + "</th>";
        html += "</tr>";
        // create html table rows:
        for (let relation of json.elements) {
            let tagKeys = Object.keys(relation.tags);
            html += "<tr class='selector' id=" + relation.id + ">";
            //main keys separate:
            for (let tagKey of mainKeys) {
                html += "<td>" + relation.tags[tagKey] + "</td>";
            }
            //all others in last column:
            html += "<td>";
            for (let tagKey of tagKeys) {
                if (!mainKeys.includes(tagKey)) {
                    html += tagKey + "=" + relation.tags[tagKey] + "; ";
                }
            }
            html += "</td>";
            html += "</tr>";
        }
        html += "</table>";
        showIn.innerHTML = html;
        // create onclick events for rows:
        for (let relation of json.elements) {
            // query should ALWAYS have .finalresult as the output set:
            let query = 'rel(' + relation.id + ')' + ' -> .finalresult;';
            let row = document.getElementById(relation.id);
            row.addEventListener("click", function (event) {
                getOSMandDoNextstep(query, 'geom', showChosenRelation, 'workflow');
            });
        }
    }
}

/*-- End of STEP 3  -*/

/*-- STEP 4: Create OSMrelation object, zoom to it  and collect stops ids to query: -*/
function showChosenRelation(json, htmlElem) {
    //first remove stops & lines if they are shown:
    stopsMapData.clear();
    legsMapData.clear();
    let showIn = document.getElementById(htmlElem);
    let html = "";
    let bbox = [0, 0, 0, 0];
    bbox[0] = json.elements[0].bounds.minlat;
    bbox[1] = json.elements[0].bounds.minlon;
    bbox[2] = json.elements[0].bounds.maxlat;
    bbox[3] = json.elements[0].bounds.maxlon;
    let numStops;
    let stops = [];
    let numPlatforms = 0;
    let numRouteParts = 0;
    let routeGeomPart = [];
    let routeGeom = [];
    let numRest = 0;
    let numTotal = json.elements[0].members.length;
    for (let member of json.elements[0].members) {
        if (member.type === "node" && member.role === "stop") {
            let stop = {};
            stop.ref = member.ref;
            stop.lat = member.lat;
            stop.lon = member.lon;
            stop.name = member.ref.toString();
            stops.push(stop);
        } else if (member.role === "platform") {
            numPlatforms++;
        } else if (member.type === "way" && member.role === "") {
            numRouteParts++;
            routeGeomPart = [];
            for (let coordPair of member.geometry) {
                routeGeomPart.push([coordPair.lon, coordPair.lat]);
            }
            routeGeom.push(routeGeomPart);
        } else {
            console.log("found member of type 'other': ");
            console.log(member);
            numRest++;
        }
    }
    // console.log( routeGeom);
    myOSMrelation = new OSMrelation(
        json.elements[0].id, json.elements[0].tags.name,
        json.elements[0].tags.from, json.elements[0].tags.to,
        bbox, routeGeom
    );
    zoomMapToBbox(bbox);

    numStops = stops.length;
    let debugMsg = "OSMRelation has " + numTotal + " members:  ";
    debugMsg += numStops + " stops,  ";
    debugMsg += numPlatforms + " platforms,  ";
    debugMsg += numRouteParts + " RouteParts,  ";
    debugMsg += numRest + " other things;  ";
    console.log(debugMsg);
    if (numStops === 0) {
        SetMessage("OSMRelation has no stops. Cannot create journey leg from it.", workflowMsg);
        showFeatureOnMap(myOSMrelation.toOlFeature(), legsMapData);
    } else {
        SetMessage("OSMRelation " + myOSMrelation.id + " (" + myOSMrelation.name + ") has " + numStops + " stops. Retrieving the stops from OSM...", workflowMsg);
        // get refs and do another query to collect full nodes with name
        let query = '(';
        for (let stop of stops) {
            query += 'node(' + stop.ref + ');';
        }
        query += ')';
        query += '->.finalresult;';
        //console.log(query);
        showFeatureOnMap(myOSMrelation.toOlFeature(), legsMapData);
        getOSMandDoNextstep(query, "geom", showStops, "workflow");
    }
}

/*-- End of STEP 4  -*/

/*-- STEP 5: Collect each Stop from OSM (because the relation did not have the stop names): -*/
function showStops(json, htmlElem) {
    legFrom = undefined;
    legTo = undefined;
    let OSMstops = json.elements;
    console.log(OSMstops);
    let numStops = OSMstops.length;
    for (let stop of OSMstops) {
        myOSMrelation.stops.push(new Stop(stop.id, stop.tags.name, [stop.lon, stop.lat]));
    }
    SetMessage("OSMRelation " + myOSMrelation.id + " (" + myOSMrelation.name + ") has " + numStops
        + " stops. Select a start and end stop and click the CONSTRUCT button...", workflowMsg);

    let showIn = document.getElementById(htmlElem);
    let toStopsHtml = "", fromStopsHtml = "";
    //Create START and END rows, and draw the OSMstops on the map:
    for (let stop of myOSMrelation.stops) {
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
        showFeatureOnMap(stop.toOlFeature(), stopsMapData);
    }
    showIn.innerHTML = HTML.showStopsTable(fromStopsHtml, toStopsHtml);

    // create onclick events for rows:
    let ConstructBtn = document.getElementById("action1Btn");
    ConstructBtn.value = 'CONSTRUCT LEG from: ... to: ...';
    ConstructBtn.style.display = "inline";
    for (let stop of myOSMrelation.stops) {
        let row = document.getElementById("from_" + stop.id);
        row.addEventListener("click", function () {
            chooseLegStop(ConstructBtn, 0, stop.id, stop.name);
        });
        row = document.getElementById("to_" + stop.id);
        row.addEventListener("click", function () {
            chooseLegStop(ConstructBtn, 1, stop.id, stop.name);
        });
    }
    ConstructBtn.addEventListener("click", function () {
        constructLeg(myOSMrelation.stops, legFrom, legTo, myOSMrelation.geometry.coordinates);
    });
}

// utility function to choose stop and construct LegConstruction Button
function chooseLegStop(ConstructBtn, toOrFrom, stopId, stopName) {
    let BtnTxt = ConstructBtn.value;
    let fromTxt = BtnTxt.substring(BtnTxt.search("from:") + 6, BtnTxt.search("to:") - 1);
    let toTxt = BtnTxt.substring(BtnTxt.search("to:") + 4, BtnTxt.length);
    if (toOrFrom === 0) { //from
        legFrom = stopId;
        fromTxt = stopName;
    } else { //to
        legTo = stopId;
        toTxt = stopName;
    }
    ConstructBtn.value = "CONSTRUCT LEG from: " + fromTxt + " to: " + toTxt;
}

//step 5 ready. Waiting for choices and CONSTRUCT btn click to start step 6
/*-- End of STEP 5  -*/

/*-- STEP 6: Construct a Leg Object with LineString geom from start to end: -*/
function constructLeg(stops, stopFrom, stopTo, geom) {
    SetMessage("Constructing journey leg...", workflowMsg);
    if (stopFrom === stopTo) {
        SetMessage("Error: 'from' and 'to' stop identical!", errorMsg);
        SetMessage('Aborted construction', workflowMsg);
    } else if (stopFrom === undefined) {
        SetMessage("Error: 'from' stop undefined!", errorMsg);
        SetMessage('Aborted construction', workflowMsg);
    } else if (stopTo === undefined) {
        SetMessage("Error: 'to' stop undefined!", errorMsg);
        SetMessage('Aborted construction', workflowMsg);
    } else {
        SetMessage('Constructing Leg object...', showMsg);
        let geomPartsOrdered = []; //same for geomParts (lineStrings)
        let coordsFrom, coordsTo;
        //First find 'from' and 'to' stops:
        coordsFrom = findStopCoords(stopFrom, stops);
        coordsTo = findStopCoords(stopTo, stops);
        if (typeof coordsFrom === "string") {
            SetMessage("Error: Stop coordinates for 'from' stop [" + coordsFrom, errorMsg); //coordsFrom will hold error message
            SetMessage('Aborted construction', workflowMsg);
        } else if (typeof coordsTo === "string") {
            SetMessage("Error: Stop coordinates for 'to' stop [" + coordsTo, errorMsg); //coordsFrom will hold error message
            SetMessage('Aborted construction', workflowMsg);
        } else {
            let theRelationLine = MultiLineString2LineString(geom);
            // console.log(theRelationLine);
            if (theRelationLine === undefined) {
                SetMessage("Error: Could not construct valid Line from OSM relation.", errorMsg);
                SetMessage('Aborted construction', workflowMsg);
            } else {
                let legGeom = extractLegFromLine(theRelationLine, coordsFrom, coordsTo);
                // console.log(legGeom);
                if (legGeom !== undefined) {
                    //first remove stops & lines of Relation:
                    stopsMapData.clear();
                    legsMapData.clear();
                    //temp name & id, UID will be created by DB if saved:
                    let tmpID = 9999999; // will be changed by Postgres to serial ID
                    myLeg = new Leg(tmpID, 'tempLeg', legGeom, undefined, undefined, myOSMrelation.id, escapeStr(myOSMrelation.name), undefined, undefined, undefined);
                    for (let stop of stops) {
                        if (stop.id === stopFrom) {
                            myLeg.stopFrom = stop;
                        }
                        if (stop.id === stopTo) {
                            myLeg.stopTo = stop;
                        }
                    }
                    myLeg.bbox = calcBbox(myLeg.geometry.coordinates);
                    // console.log(myLeg);
                    showFeatureOnMap(myLeg.toOlFeature(), legsMapData);
                    showFeatureOnMap(myLeg.stopFrom.toOlFeature(), stopsMapData);
                    showFeatureOnMap(myLeg.stopTo.toOlFeature(), stopsMapData);
                    zoomMapToBbox(myLeg.bbox);
                    SetMessage('Constructed Leg object.', workflowMsg);
                    SetMessage("Constructed Journey Leg. Retry, Add properties, or start over by selecting another relation in the map...", workflowMsg);
                    let SaveBtn = document.getElementById("action2Btn");
                    SaveBtn.value = 'ADD PROPERTIES';
                    SaveBtn.style.display = "inline";
                    SaveBtn.addEventListener("click", function() {
                        showSaveLegForm(myLeg, "workflow");
                    });
                    //
                }
            }
        }
    }
}
/*-- End of STEP 6  -*/

/*-- STEP 7: show form to save leg in DB: -*/
function showSaveLegForm(theLeg, htmlElem) {

    document.getElementById("action1Btn").style.display = "none";
    document.getElementById("action2Btn").style.display = "none";
    SetMessage("Fill in properties and save...", workflowMsg);

    let showIn = document.getElementById(htmlElem);
    const tmpGEOJSON = JSON.stringify(theLeg.geometry);

    /*-- Submit of this Form will trigger STEP 8  -*/
    const html = HTML.saveLegForm(theLeg);
    showIn.innerHTML = html;
    let SaveBtn = document.getElementById("action3Btn");
    SaveBtn.value = 'SAVE LEG IN DB';
    SaveBtn.style.display = "inline";
    // console.log(theLeg);
    DEBUG = theLeg;
    SaveBtn.addEventListener("click", function() {
        theLeg.startDateTime = document.getElementById("leg_startdatetime").value;
        theLeg.endDateTime = document.getElementById("leg_enddatetime").value;
        theLeg.name = escapeStr(document.getElementById("leg_name").value);
        theLeg.notes = escapeStr(document.getElementById("leg_notes").value);
        // console.log(theLeg);
        saveLeg(theLeg);
    });


}

/*-- End of STEP 7  -*/

/*-- STEP 8: save the constructed leg in DB: -*/

async function saveLeg(theLeg) {

    let fromStopIsNew = await DB.addStopIfNew(theLeg.stopFrom);
    let toStopIsNew = await DB.addStopIfNew(theLeg.stopTo);
    let legAdded = await DB.addLeg(theLeg);
    if (legAdded) {
        SetMessage("Saved Leg in DB.", workflowMsg);
        SetMessage("### Leg construction finished ###", workflowMsg);
        document.getElementById("workflow").innerHTML = '';
        document.getElementById("action3Btn").style.display = "none";
        document.getElementById("action2Btn").style.display = "none";
        document.getElementById("action1Btn").style.display = "none";
        stopsMapData.clear();
        legsMapData.clear();
        //** ...and we go back to the end of step 1, waiting for a click in the map....
        const curCenter = ol.proj.transform(mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
        const curZoom = mapView.getZoom();
        window.location="./constructLeg.html?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
    }
}
/*-- End of STEP 8  -*/



