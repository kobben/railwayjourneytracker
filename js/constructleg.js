//Globals:
let myMap, mapView;
let newLegsData, legsData, stopsData;
let stopFromID, stopToID;
let tmpOSMrelation;
let allStops, allLegs; // create one global version;
let legTypes, legTypesMenu;


/*-- Initialization function --*/
async function initConstructLegs() {
    UI.InitMessages(true);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (DB.init('http://localhost:3000', authToken)) {
        UI.SetMessage("Initializing leg construction...", workflowMsg);
        legTypes = await loadTypesFromDB(''); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
        // first load all stops for use in menus etc.
        allStops = await loadStopsFromDB(''); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
        let startAt = getParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            initMap([startAt[0], startAt[1]], startAt[2], findOSMrelation); //location from params
        } else {
            initMap([14.0, 48.5], 5, findOSMrelation); //Europe
        }
        // ** step 2:
        UI.SetMessage("Load existing Legs...", workflowMsg);
        let showIn = document.getElementById('workflow');
        showIn.innerHTML = HTML.searchLegForm(createStopsOptions(allStops));
        // ** wait for form to be submitted => step 3 = searchLegs() **//
    } else {
        UI.SetMessage("Could not initialise DB connection.", errorMsg);
    }
}

/*-- end of init -*/

/*-- **************************** -*/
/*-- Workflow/Interactivity Steps:-*/
/*-- **************************** -*/


/*-- STEP 3: Load Legs & show them  -*/
async function searchLegs(theWhereStr) {
    allLegs = await loadLegsFromDB(theWhereStr); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
    mapLegs(allLegs, true);
    zoomToLegs(true);
    // *** Step 3 done, go step 4:
    document.getElementById('workflow').innerHTML = ""; // empty workflow div
    UI.SetMessage("Start by selecting an OSM relation in the map...", workflowMsg);
// step 3 done, waiting for mapclick to trigger step 4...
}
/*-- End of STEP 3  -*/



/*-- Generic function to take results of step x to query OSM and carry results to step x+1:   -*/
// in Functions.js
/*-- End of getOSMandDoNextstep  -*/

/*-- STEP 4: map was clicked, check which OSMRelations are near  -*/
function findOSMrelation(evt) {
    //first remove stops & lines if they are shown:
    stopsData.clear();
    newLegsData.clear();
    let curZoom = mapView.getZoom();
    if (curZoom <= 7) {
        UI.SetMessage("Zoom in further to select routes!", workflowMsg);
    } else {
        let mercClicked = evt.coordinate;
        let osmClicked = merc2osm(mercClicked);
        const searchSizeBase = 2.000;
        // base = 2 works out same ca 7 pixels width (square only at equator) in all zoom levels
        // searchsize in degrees at zoomlevel 1,  halfs for every zoom step down:
        let searchSizeLon = searchSizeBase / (2 ** (curZoom - 1));
        // compensate for mercator distortion, very approx. gets square on Mid European latitudes
        let searchSizeLat = searchSizeLon * 0.6666;
        let osmBbox = "(" + (osmClicked[1] - searchSizeLat) + "," + (osmClicked[0] - searchSizeLon) + "," +
            (osmClicked[1] + searchSizeLat) + "," + (osmClicked[0] + searchSizeLon) + ")";
        showOsmBboxOnMap(osmBbox, newLegsData);
        // query should ALWAYS have .finalresult as the output set:
        let query = '(';
        query += 'rel["route"~"train",i] ' + osmBbox + ';'
        query += 'rel["route"~"rail",i] ' + osmBbox + ';'
        query += 'rel["route"~"subway",i] ' + osmBbox + ';'
        query += 'rel["route"~"tram",i] ' + osmBbox + ';'
        query += 'rel["route"~"ferry",i] ' + osmBbox + ';'
        query += ')';
        query += '->.finalresult;';
        // console.log(query);
        getOSMandDoNextstep(query, 'geom', showFoundRelations, 'workflow');
    }
}
/*-- End of STEP 4  -*/

/*-- STEP 5: List the OSMrelations found and let the user choose one  -*/
function showFoundRelations(json, htmlElem) {
    const mainKeys = ["ref", "name", "from", "to"];
    let showIn = document.getElementById(htmlElem);
    let html = "";
    let numRelations = json.elements.length;
    if (numRelations === 0) {
        html = "<h4>No relations found...</h4>";
        showIn.innerHTML = html;
    } else {
        UI.SetMessage("Found " + numRelations + " relations. Select the relation you want to use...", workflowMsg);
        html += "<table class='tableFixHead'>";
        //header:
        html += "<tr><thead>";
        html += "<th>id</th>";
        for (let tagKey of mainKeys) {
            html += "<th>" + tagKey + "</th>";
        }
        html += "<th class='selector'>" + "other tags" + "</th>";
        html += "</thead></tr>";
        // create html table rows:
        for (let relation of json.elements) {
            let tagKeys = Object.keys(relation.tags);
            html += "<tr class='selector' id=" + relation.id + ">";
            //main keys separate:
            html += "<td>" + relation.id + "</td>";
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
/*-- End of STEP 5  -*/

/*-- STEP 6: Create OSMrelation object, zoom to it  and collect stops ids to query: -*/
function showChosenRelation(json, htmlElem) {
    //first remove stops & lines if they are shown:
    stopsData.clear();
    newLegsData.clear();
    tmpOSMrelation = undefined;
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
        if (member.type === "node" && (member.role === "stop" || member.role.startsWith("stop") ) ) { // to also include "stop_entry_only" & "stop_exit_only"
            let stop = {};
            stop.ref = member.ref;
            stop.lat = member.lat;
            stop.lon = member.lon;
            stop.name = member.ref.toString();
            stops.push(stop);
        } else if (member.role === "platform") {
            numPlatforms++;
        // TODO: or maybe accept more member roles (or all??)
        } else if (member.type === "way" &&
            (member.role === "" || member.role === "forward" || member.role === "backward") ) {
            numRouteParts++;
            routeGeomPart = [];
            for (let coordPair of member.geometry) {
                routeGeomPart.push([coordPair.lon, coordPair.lat]);
            }
            routeGeom.push(routeGeomPart);
        } else {
            // TODO: or maybe accept more member roles (or all??)
            console.log("found member of unexpected type: ");
            console.log(member);
            numRest++;
        }
    }
    // console.log( routeGeom);
    tmpOSMrelation = new OSMrelation(
        json.elements[0].id, json.elements[0].tags.name,
        json.elements[0].tags.from, json.elements[0].tags.to,
        bbox, routeGeom
    );

    showFeatureOnMap(tmpOSMrelation.toOlFeature(), newLegsData);
    zoomMapToBbox(tmpOSMrelation.bbox);

    numStops = stops.length;
    let debugMsg = "OSMRelation has " + numTotal + " members:  ";
    debugMsg += numStops + " stops,  ";
    debugMsg += numPlatforms + " platforms,  ";
    debugMsg += numRouteParts + " RouteParts,  ";
    debugMsg += numRest + " other things;  ";
    console.log(debugMsg);

    let relationGeom = extractLineFromMultiline(tmpOSMrelation.geometry.coordinates, true);

    if (relationGeom !== undefined) { // now continue finding the stops to use:
        tmpOSMrelation.geometry.coordinates = relationGeom;
        if (numStops === 0) {
            UI.SetMessage("OSMRelation has no stops. Use Stops in DB (or create them first).", workflowMsg);
            showStops(undefined, "workflow"); // next step without OSM stops...
        } else {
            UI.SetMessage("OSMRelation " + tmpOSMrelation.id + " (" + tmpOSMrelation.name + ") has " + numStops + " stops. Retrieving the stops from OSM...", workflowMsg);
            // get refs and do another query to collect full nodes with name
            let query = '(';
            for (let stop of stops) {
                query += 'node(' + stop.ref + ');';
            }
            query += ')';
            query += '->.finalresult;';
            //console.log(query);
            getOSMandDoNextstep(query, "geom", showStops, "workflow");
        }
    }
}
/*-- End of STEP 6  -*/


/*-- STEP 7: Collect each Stop from OSM (because the relation did not have the stop names): -*/
// async function showStops(json, htmlElem) {
// in Functions.js
//step 7 ready. Waiting for choices and CONSTRUCT btn click to start step 6
/*-- End of STEP 7  -*/

/*-- STEP 8: Construct a Leg Object with LineString geom from start to end: -*/
function constructLeg(stopsInRel, stopFromID, stopToID, geom) {
    UI.SetMessage("Constructing journey leg...", workflowMsg);

    if (stopFromID === stopToID) {
        UI.SetMessage("Error: 'from' and 'to' stop identical!", errorMsg);
        UI.SetMessage('Aborted construction', workflowMsg);
    } else if (stopFromID === undefined) {
        UI.SetMessage("Error: 'from' stop undefined!", errorMsg);
        UI.SetMessage('Aborted construction', workflowMsg);
    } else if (stopToID === undefined) {
        UI.SetMessage("Error: 'to' stop undefined!", errorMsg);
        UI.SetMessage('Aborted construction', workflowMsg);
    } else {
        UI.SetMessage('Constructing Leg object...', workflowMsg);
        //First try to find 'from' stops in relation stops:
        let coordsFrom = findStopCoords(stopFromID, stopsInRel);
        // if not found, then try in allStops:
        if (coordsFrom === 0) coordsFrom = findStopCoords(stopFromID, allStops);
        if (coordsFrom === 0) { // still 0  => error
            UI.SetMessage("Error: Stop coordinates for 'from' stop [" + coordsFrom + "not found (or found multiple times).", errorMsg);
            UI.SetMessage('Aborted construction', workflowMsg);
        } else {
            //First try to find 'to' stops in relation stops:
            let coordsTo = findStopCoords(stopToID, stopsInRel);
            // if not found, then in allStops:
            if (coordsTo === 0) coordsTo = findStopCoords(stopToID, allStops);
            if (coordsTo === 0) { // still 0  => error
                UI.SetMessage("Error: Stop coordinates for 'to' stop [" + coordsTo + "not found (or found multiple times).", errorMsg);
                UI.SetMessage('Aborted construction', workflowMsg);
            } else {
                /// ** go step 7
               createLeg(geom, coordsFrom, coordsTo, stopsInRel, stopFromID, stopToID);
            }
        }
    }
}
/*-- End of STEP 8  -*/

/*-- STEP 9: create Leg & show btn to save: -*/
function createLeg(geom, coordsFrom, coordsTo, stopsInRel, stopFromID, stopToID) {
    if (geom === undefined || geom === null || geom === '') {
        UI.SetMessage("Error: Could not construct valid Line from OSM relation.", errorMsg);
        UI.SetMessage('Aborted construction', workflowMsg);
    } else {
        let legGeom = extractLegFromLine(geom, coordsFrom, coordsTo);
        // first remove stops & lines of Relation from map:
        stopsData.clear();
        newLegsData.clear();
        //temp name & id, UID will be created by DB if saved:
        let tmpID = 999999; // will be changed by Postgres to serial ID
        let tmpLeg = undefined;
        tmpLeg = new Leg(tmpID, 'tmpLeg', legGeom, undefined, undefined,
            '', '', '', 0);
        //first copy stops from relation (if in there)
        let stopFromAdded = false;
        let stopToAdded = false;
        for (let stop of stopsInRel) {
            if (stop.id === stopFromID) {
                tmpLeg.stopFrom = stop;
                stopFromAdded = true;
            }
            if (stop.id === stopToID) {
                tmpLeg.stopTo = stop;
                stopToAdded = true;
            }
        }
        //if not found, copy stops from all Stops
        for (let stop of allStops) {
            if (!stopFromAdded && stop.id === stopFromID) {
                tmpLeg.stopFrom = stop;
                stopFromAdded = true;
            }
            if (!stopToAdded && stop.id === stopToID) {
                tmpLeg.stopTo = stop;
                stopToAdded = true;
            }
        }
        if (!stopFromAdded || !stopToAdded) {
            UI.SetMessage("From and/or To stops could not be created correctly...", errorMsgMsg);
        } else {
            tmpLeg.bbox = calcBbox(tmpLeg.geometry.coordinates);
            // console.log(myLeg);
            showFeatureOnMap(tmpLeg.toOlFeature(), newLegsData);
            showFeatureOnMap(tmpLeg.stopFrom.toOlFeature(), stopsData);
            showFeatureOnMap(tmpLeg.stopTo.toOlFeature(), stopsData);
            zoomMapToBbox(tmpLeg.bbox);

            // UI.SetMessage('Constructed Leg object.', workflowMsg);
            UI.SetMessage("Constructed Journey Leg. Add properties & Save, or start over by selecting another relation in the map...", workflowMsg);

            let SaveBtn = document.getElementById("action3Btn");
            SaveBtn.value = 'ADD PROPERTIES & SAVE';
            SaveBtn.style.display = "inline";
            SaveBtn.addEventListener("click", function () {
                // **** Go step 8:
                showSaveLegForm(tmpLeg, "workflow", "constructleg");
            });
        }
    }
}
/*-- End of STEP 9  -*/

/*-- STEP 10: show form to save leg in DB: -*/
// function showSaveLegForm(theLeg, htmlElem)
// in Functions.js
// idf= save btn used, will trigger Step 9
/*-- End of STEP 10  -*/

/*-- STEP 11: save the constructed leg in DB: -*/
// async function saveLegInDB(theLeg)
// in Functions.js
/*-- End of STEP 11  -*/



