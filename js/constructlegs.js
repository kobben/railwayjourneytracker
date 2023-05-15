// ***************************************************************//
// CONSTRUCTLEG
// this APP lets you create Legs based on OSM relations, and store them in a DB.
//
// v1.0  May 2023, see README.md for details
// ***************************************************************//
// ***************************************************************//
//
// we create a global APP obj here:
let APP = {
    name: "constructLegs",
    url: "constructlegs.html",
    // needed for postREST DB access:
    authToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw",
    map: undefined,
    OSMrelation: undefined,
    allstops: undefined, //always need a collection of all existing stops for various tasks
    legstops: undefined, //these are the stops that are end- or startpoint of the selected legs
    legs: undefined,
    candidatelegs: undefined, //used for temp set of legs to choose from (eg in constructLineManually()
    legtypes: undefined,
    restart: function () {
        const curZoom = APP.map.mapView.getZoom();
        const curCenter = ol.proj.transform(APP.map.mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
        window.location = "./" + APP.url + "?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
    }
};

/*-- Initialization function --*/
async function initConstructLegs() {
    UI.InitMessages(true);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (await DB.init('http://localhost:3000', authToken)) {
        UI.SetMessage("Initializing constructLegs APP...", workflowMsg);
        APP.legtypes = await DB.loadTypesFromDB('legtypes');
        // ***********
        // ** step 1:
        // ***********
        let startAt = getURIParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            APP.map = MAP.init("ShowLegsMap", [startAt[0], startAt[1]], startAt[2], findOSMrelation, false); //loc from params
        } else {
            // Enschede = [6.89, 52.22], 11
            // Frankfurt = [8.64, 50.08], 11
            APP.map = MAP.init("ShowLegsMap", [8.64, 50.08], 12, findOSMrelation, true);
        }
        APP.map.StopStyle = MAP.stopStyleBlue;
        APP.map.StopSelectedStyle = MAP.stopStyleRed;
        APP.map.LegStyle = MAP.lineStyleBlue;
        APP.map.LegSelectedStyle = MAP.lineStyleRed;
        APP.map.JourneyStyle = MAP.lineStyleGrey;
        APP.map.JourneySelectedStyle = MAP.lineStyleRed;
        APP.map.displayLayer("openRailwayMap", false);
        APP.map.displayLayer("Journeys", false);
        // create datastructures needed later:
        APP.legs = new LegsCollection(APP.map.getLayerDataByName("Legs"));
        APP.legstops = new StopsCollection(APP.map.getLayerDataByName("Stops"));
        APP.allstops = new StopsCollection(null); //non-mappable!
        await APP.allstops.loadFromDB(''); //empty WhereStr makes that ALL stops are loaded.
        /*-- ***********/
        // ** step 2:
        // ***********
        showSearchLegsForm(true, false, true,null); // in Utils.js
        // ** wait for form to be submitted
        //  returns with APP.legs + APP.legstops set
        //   ==> step 3: create various menus
        // ***********
        UI.SetMessage("Start by selecting an OSM relation in the map...", workflowMsg);
        let NewSearchBtn = document.getElementById("action1Btn");
        NewSearchBtn.value = 'New DB Search';
        NewSearchBtn.style.display = "inline";
        NewSearchBtn.addEventListener("click", function () {
            if (APP.legs === undefined || APP.legs === null) {
                // no search yet, so ignore this btn
            } else { //new search of legs
                APP.legs.clearMap();
                APP.legs = undefined;
                APP.legstops.clearMap();
                APP.legstops = undefined;
                APP.legs = new LegsCollection(APP.map.getLayerDataByName("Legs"));
                APP.legstops = new StopsCollection(APP.map.getLayerDataByName("Stops"));
                APP.map.getLayerDataByName("NewLegs").clear();
                APP.map.getLayerDataByName("NewStops").clear();
                showSearchLegsForm(true,false, true, null); // in Utils.js
            }
        });
    } else {
        UI.SetMessage("Could not initialise DB connection.", errorMsg);
    }
}

/*-- end of init -*/

/*-- **************************** -*/
/*-- Workflow/Interactivity Steps:-*/
/*-- **************************** -*/


/*-- STEP 4: map was clicked, check which OSMRelations are near  -*/
// note this is the function initially set as callback for when the map is clicked,
// this changes when constructLineManually() is triggered!
function findOSMrelation(evt) {
    //first remove stops & lines if they are shown:
    APP.map.getLayerDataByName("NewStops").clear();
    APP.map.getLayerDataByName("NewLegs").clear();
    let curZoom = APP.map.mapView.getZoom();
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
        showOsmBboxOnMap(osmBbox, "NewLegs");
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
        getOSMandDoNextstep(query, 'geom', showFoundRelations, UI.workflowPane);
    }
}
/*-- End of STEP 4  -*/

/*-- STEP 5: List the OSMrelations found and let the user choose one  -*/
function showFoundRelations(json) {
    const mainKeys = ["ref", "name", "from", "to"];
    let osmObjects = json.elements;
    let numRelations = osmObjects.length;
    if (numRelations === 0) {
        UI.SetMessage("<h4>No relations found...</h4>", workflowMsg);
    } else {
        UI.SetMessage("Found " + numRelations + " relations. Select the relation you want to use...", workflowMsg);
        UI.workflowPane.innerHTML = HTML.showOSMobjectsTable(osmObjects, mainKeys);
        // create onclick events for rows:
        for (let aRelation of osmObjects) {
            let query = 'rel(' + aRelation.id + ')' + ' -> .finalresult;';
            let row = document.getElementById(aRelation.id);
            row.addEventListener("click", function () {
                getOSMandDoNextstep(query, 'geom', showChosenRelation, UI.workflowPane);
                // if row is clicked => /***** step 6: ****/
            });
        }
    }
}

/*-- End of STEP 5  -*/

/*-- STEP 6: Create OSMrelation object, zoom to it  and collect stops ids to query: -*/
function showChosenRelation(json) {
    //first remove new stops & legs if they are shown:
    APP.map.getLayerDataByName("NewStops").clear();
    APP.map.getLayerDataByName("NewLegs").clear();
    let relStops = [];
    let numPlatforms = 0;
    let numRouteParts = 0;
    let routeGeomPart = [];
    let routeGeom = [];
    let numRest = 0;
    let numStops = 0;
    let numTotal = json.elements[0].members.length;
    let bbox = [0, 0, 0, 0];
    bbox[0] = json.elements[0].bounds.minlat;
    bbox[1] = json.elements[0].bounds.minlon;
    bbox[2] = json.elements[0].bounds.maxlat;
    bbox[3] = json.elements[0].bounds.maxlon;
    for (let member of json.elements[0].members) {
        if (member.type === "node" && member.role.startsWith("stop")) { // to also include "stop_entry_only" & "stop_exit_only"
            let relStop = {};
            relStop.ref = member.ref;
            relStop.lat = member.lat;
            relStop.lon = member.lon;
            relStop.name = member.ref.toString(); //NOTE: this is not the actual stop name, that has to be queried separately later!
            relStops.push(relStop);
            numStops++;
        } else if (member.role === "platform") {
            numPlatforms++;
        } else if (member.type === "way" &&
            (member.role === "" || member.role === "forward" || member.role === "backward")) {
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
    APP.OSMrelation = new OSMrelation(
        json.elements[0].id, json.elements[0].tags.name,
        undefined, undefined, // start out undefined
        json.elements[0].tags.from, json.elements[0].tags.to,
        bbox, routeGeom
    );
    APP.OSMrelation.relStops = relStops;

    let debugMsg = "OSMRelation has " + numTotal + " members:  ";
    debugMsg += numStops + " stops,  ";
    debugMsg += numPlatforms + " platforms,  ";
    debugMsg += numRouteParts + " RouteParts,  ";
    debugMsg += numRest + " others;  ";
    UI.SetMessage(debugMsg, workflowMsg);
    APP.OSMrelation.showOnMap(APP.map.getLayerDataByName("NewLegs"));
    MAP.zoomToBbox(APP.OSMrelation.bbox);

    let relationGeom = extractLineFromMultiline(routeGeom, true);
    // after this the realationGeom is either created automatically => conmtinue with setting Stops
    // or remains undefined => the UI is switched into an alternative workflow of manually merging the parts...

    if (relationGeom !== undefined) { // now continue finding the stops to use:
        APP.OSMrelation.geometry.coordinates = relationGeom;
        evaluateStops(APP.OSMrelation.relStops);
    } else {
        // this happens if at first there is no relationGeom, and when switched to manual construction...
        UI.SetMessage('Undefined relationGeom, trying manual construction...', workflowMsg);
    }
}
// seperated this a a function because we need to call it from constructLineManually()
// to switch back into the normal workflow
function evaluateStops(relStops) {
    const numStops = relStops.length;
    if (numStops === 0) {
        // go directly to step 8
        chooseStopsForConstruction(); // next step 8 without OSM stops...
    } else {
        // get refs...
        let query = '(';
        for (let stop of relStops) {
            query += 'node(' + stop.ref + ');';
        }
        query += ')';
        query += '->.finalresult;';
        // ...and do step 7: another query to collect full stop nodes with name
        getOSMandDoNextstep(query, "geom", collectStopsFromOSM);
    }
}
/*-- End of STEP 6  -*/


/*-- ***************************
    STEP 7 collectStopsFromOSM function : Collect each Stop separately from OSM
    (because the relationstops did not have the names)
     *************************** -*/
async function collectStopsFromOSM(json) {
    let OSMstops = json.elements;
    for (let stop of OSMstops) {
        // console.log(stop);
        let stopName = "undefined";
        if (stop.tags) {
            stopName = stop.tags.name;
        }
        APP.OSMrelation.stops.push(new Stop(stop.id, stopName, [stop.lon, stop.lat]));
    }
    chooseStopsForConstruction(); // go Step 8
}


/*-- **************************** -*/
/*-- STEP choose Stops: show them in a menu to choose from and create a "Construct" button: -*/
function chooseStopsForConstruction() {
    UI.hideActionBtns();
    UI.SetMessage("OSMRelation " + APP.OSMrelation.id + " (" +
        APP.OSMrelation.name + ") has " + APP.OSMrelation.stops.length +
        " stops. Select start and end stops and click the CONSTRUCT button...", workflowMsg);
    UI.workflowPane.innerHTML = HTML.constructLegForm(APP.OSMrelation.stops, APP.allstops);
    let selectFromDBMenu = document.getElementById("menu_from");
    selectFromDBMenu.addEventListener("change", function () {
        let selStopId = selectFromDBMenu.value;
        let selStopName = selectFromDBMenu.item(selectFromDBMenu.options.selectedIndex).innerText;
        pickFromStop(selStopId, selStopName);
    });
    let selectToDBMenu = document.getElementById("menu_to");
    selectToDBMenu.addEventListener("change", function () {
        let selStopId = selectToDBMenu.value;
        let selStopName = selectToDBMenu.item(selectToDBMenu.options.selectedIndex).innerText;
        pickToStop(selStopId, selStopName);
    });
    let ConstructBtn = document.getElementById("ConstructBtn");
    ConstructBtn.addEventListener("click", function () {
        doConstructLeg();
    });
    let RefreshStopsBtn = document.getElementById("RefreshStopsBtn");
    RefreshStopsBtn.addEventListener("click", async function () {
        await APP.allstops.loadFromDB(''); // 'where' uses PostGREST syntax, empty select all
        APP.allstops.selectStops(0); // all off
        chooseStopsForConstruction(); //just restart this function...
    });
    let CancelBtn = document.getElementById("CancelBtn");
    CancelBtn.addEventListener("click", async function () {
        APP.map.getLayerDataByName("NewLegs").clear();
        APP.map.getLayerDataByName("NewStops").clear();
        UI.workflowPane.innerHTML = '';
        UI.showActionBtns();
        UI.SetMessage("Cancelled. Start by selecting an OSM relation in the map...", workflowMsg);
    });
}
/*-- **************************** -*/
//Waiting for choices and CONSTRUCT btn click to start next step
/*-- **************************** -*/
/*-- End of STEP 7  -*/

/// TWO utility functions to allow chosing from and to staps by 2 methods:o
// 1. choosing from OSM relation stops, using the clickable table created in HTML.createStopsTableRows()
// 2. choosing from Stops exisiting in DB, using the pulldown menu created in HTML.createStopsOptions()
function pickFromStop(id, name) {
    APP.OSMrelation.fromName = name;
    document.getElementById("ConstructBtn").innerHTML = "CONSTRUCT LEG FROM " + APP.OSMrelation.fromName +
        " TO " + APP.OSMrelation.toName;
    let theFromStop = undefined;
    for (let aStop of APP.OSMrelation.stops) { // first check if OSM relation stop
        if (parseInt(aStop.id) === parseInt(id)) { // id might be stored as Str!
            theFromStop = aStop;
        }
    }
    if (theFromStop === undefined) { // not in OSM rel, check DB
        for (let aStop of APP.allstops.getStops()) { // first check if OSM relation stop
            if (parseInt(aStop.id) === parseInt(id)) { // id might be stored as Str!
                theFromStop = aStop;
            }
        }
    }
    if (theFromStop === undefined) { // not in OSM rel, nor in DB!
        UI.SetMessage("Unexpected ERROR: chosen stop is not found in OSM relation nor in DB!", errorMsg);
    } else {
        if (APP.OSMrelation.fromStop) { //if already a fromStop shown, remove it first
            APP.OSMrelation.fromStop.removeFromMap(APP.map.getLayerDataByName("NewStops"));
        }
        APP.OSMrelation.fromStop = theFromStop;
        APP.OSMrelation.fromStop.selectOnMap(true, APP.map.getLayerDataByName("NewStops"));
    }
}
function pickToStop(id, name) {
    APP.OSMrelation.toName = name;
    document.getElementById("ConstructBtn").innerHTML = "CONSTRUCT LEG FROM " + APP.OSMrelation.fromName +
        " TO " + APP.OSMrelation.toName;
    let theToStop = undefined;
    for (let aStop of APP.OSMrelation.stops) { // first check if OSM relation stop
        if (parseInt(aStop.id) === parseInt(id)) { // id might be stored as Str!
            theToStop = aStop;
        }
    }
    if (theToStop === undefined) { // not in OSM rel, check DB
        for (let aStop of APP.allstops.getStops()) { // first check if OSM relation stop
            if (parseInt(aStop.id) === parseInt(id)) { // id might be stored as Str!
                theToStop = aStop;
            }
        }
    }
    if (theToStop === undefined) { // not in OSM rel, nor in DB!
        UI.SetMessage("Unexpected ERROR: chosen stop is not found in OSM relation nor in DB!", errorMsg);
    } else {
        if (APP.OSMrelation.toStop) { //if already a toStop shown, remove it first
            APP.OSMrelation.toStop.removeFromMap(APP.map.getLayerDataByName("NewStops"));
        }
        APP.OSMrelation.toStop = theToStop;
        APP.OSMrelation.toStop.selectOnMap(true, APP.map.getLayerDataByName("NewStops"));
    }
}
// end of utility functions


/*-- **************************** -*/
/*-- STEP 8: Construct a Leg Object with LineString geom from start to end: -*/
/*-- **************************** -*/
function doConstructLeg() {
    UI.SetMessage("Constructing journey leg...", workflowMsg);
    if (APP.OSMrelation.fromStop === APP.OSMrelation.toStop) {
        UI.SetMessage("Error: 'from' and 'to' stop identical!", errorMsg);
        UI.SetMessage('Aborted construction', workflowMsg);
    } else if (APP.OSMrelation.fromStop === undefined) {
        UI.SetMessage("Error: 'from' stop undefined!", errorMsg);
        UI.SetMessage('Aborted construction', workflowMsg);
    } else if (APP.OSMrelation.toStop === undefined) {
        UI.SetMessage("Error: 'to' stop undefined!", errorMsg);
        UI.SetMessage('Aborted construction', workflowMsg);
    } else {
        UI.SetMessage('Constructing Leg object...', workflowMsg);
        let legGeom = extractLegFromLine(APP.OSMrelation.geometry.coordinates, APP.OSMrelation.fromStop.geometry.coordinates,
            APP.OSMrelation.toStop.geometry.coordinates);
        //temp name & id, UID will be created by DB if saved:
        let tmpID = 999999; // will be changed by Postgres to serial ID
        let newLeg;
        newLeg = new Leg(tmpID, legGeom, APP.OSMrelation.fromStop, APP.OSMrelation.toStop, '', '', '', 0, false);
        newLeg.bbox = calcBbox(newLeg.geometry.coordinates);
        // console.log(tmpLeg);
        APP.map.getLayerDataByName("NewLegs").clear();
        newLeg.showOnMap(APP.map.getLayerDataByName("NewLegs"));
        MAP.zoomToBbox(newLeg.bbox);
        showSaveLegForm(newLeg, UI.workflowPane, "constructleg");
    }
}
/*-- End of STEP 8  -*/


/*-- Utilty Function used only in this APP -*/
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
    // Now do next steps, depending on the results of the JSTS LineMerge...
    if (mergedLineStrings.array.length === 1) {
        // Merge into 1 line successfully, as expected in "normal" OSM routes
        // OR when returning here after manual selection!
        //return the merged string geom
        return jsts_writer.write(mergedLineStrings.get(0)).coordinates;

    } else if (mergedLineStrings.array.length < 1) { // No success at all, abort
        UI.SetMessage('Merging multiLineString rendered no usable LineString.', errorMsg);
        if (automatic) { // give up
            UI.SetMessage('Aborted, no Leg created.', workflowMsg);
            return undefined;
        } else { // return and try again...
            return undefined;
        }

    } else if (mergedLineStrings.array.length > 1) {
        // ***********
        // More linestrings found, now we have to manually
        // choose an ordered set that can be used to create linestring Merge
        let messageStr = "This route contains multiple line segments, which cannot be merged automatically.\n";
        if (automatic) { // give up automatic - try manually
            messageStr += "You can try to create a Leg 'manually' using the appropriate App.\n";
            messageStr += "If you click OK, you will be transferred there, with the current OSMrelationID [" + APP.OSMrelation.id + "] preset...";
            if (confirm(messageStr)) {
                // switches into the alternative workflow of manual construction :
                constructLineManually(jsts_writer, mergedLineStrings);
                // Will NOT return here, but after successfull merging will call my mother function again: extractLineFromMultiline()
            } else {
                return undefined;
            }
        } else { // return and try again...
            messageStr += "Re-try with different selection...";
            alert(messageStr);
            return undefined;
        }

    } else { // theoretically can't happen...
        UI.SetMessage('Unexpected error using JSTS LineMerger.', errorMsg);
        UI.SetMessage('Aborted, no Leg created.', workflowMsg);
        return undefined;
    }
}
/*-- End of extractLineFromMultiline() -*/




function constructLineManually(jsts_writer, jstsLineStrings) {
    UI.workflowPane.innerHTML = '';
    APP.map.getLayerDataByName("NewLegs").clear();
    APP.candidatelegs = new LegsCollection(APP.map.getLayerDataByName("NewLegs"));
    for (let i = 0; i < jstsLineStrings.array.length; i++) {
        let geom = jsts_writer.write(jstsLineStrings.get(i)).coordinates;
        let tmpLeg = new Leg(i+9000, geom, undefined, undefined, undefined, undefined, undefined, 0, false);
        tmpLeg.selected = false;
        tmpLeg.bbox = calcBbox(tmpLeg.geometry.coordinates);
        APP.candidatelegs.addLeg(tmpLeg);
    }
    APP.candidatelegs.selectLegs(0);// unselect all
    APP.candidatelegs.mapLegs(null, true);
    let mergedGeom = undefined;

    UI.SetMessage("Click in map to select/unselect parts of the route...", workflowMsg);
    UI.resetActionBtns();

    let ZoomBtn = document.getElementById("action1Btn");
    ZoomBtn.value = 'Zoom to selection';
    ZoomBtn.style.display = "inline";
    ZoomBtn.addEventListener("click", function () {
        // zoom to legs where .selected = true
        MAP.zoomToBbox(APP.candidatelegs.calculateBbox(true));
    });
    let ResetBtn = document.getElementById("action2Btn");
    ResetBtn.value = "Reset selection";
    ResetBtn.style.display = "inline";
    ResetBtn.addEventListener("click", function () {
        APP.candidatelegs.selectLegs(0); // unselect all
        // remove accept btn if shown, because selection changed
        if (document.getElementById("action4Btn").style.display === "inline") {
            document.getElementById("action4Btn").style.display = "none";
        }
    });
    let MergeBtn = document.getElementById("action3Btn");
    MergeBtn.value = "MERGE selection";
    MergeBtn.style.display = "inline";
    MergeBtn.addEventListener("click", function () {
        routeGeom = [];
        for (aLeg of APP.candidatelegs.getLegs()) {
            if (aLeg.selected) {
                routeGeom.push(aLeg.geometry.coordinates);
            }
        }
        mergedGeom = extractLineFromMultiline(routeGeom, false);
        if (mergedGeom === undefined) {
            //not successful, keep trying
        } else {
            // succesfull, offer finalisation
            AcceptBtn.style.display = "inline";
        }
    });
    let AcceptBtn = document.getElementById("action4Btn");
    AcceptBtn.value = "ACCEPT Merge & Continue";
    AcceptBtn.style.display = "none";
    AcceptBtn.addEventListener("click", function () {
        APP.OSMrelation.geometry.coordinates = mergedGeom;
        // No switch back into normal workflow with choosing of stops:
        UI.resetActionBtns();
        APP.map.changeClickCallback(selectClickedLeg,findOSMrelation);
        evaluateStops(APP.OSMrelation.relStops);
    });
    UI.showActionBtns();
    APP.map.changeClickCallback(findOSMrelation, selectClickedLeg);
}

// alternative callback function for clicks in map: will toggle selection of clicked legs
/*--  STEP 4alt : toggling legs clicked in the map -*/
function selectClickedLeg(evt) {
    let idsClicked = MAP.idsFoundAtClick(evt);
    if (idsClicked) {
        for (let id of idsClicked) {
            APP.candidatelegs.selectLegs(id);
            // remove accept btn if shown, because selection changed
            if (document.getElementById("action4Btn").style.display === "inline") {
                document.getElementById("action4Btn").style.display = "none";
            }
        }
    }
}



