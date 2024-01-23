// ***************************************************************//
// CONSTRUCTSTOPS
// this APP lets you create Stops by extracting them from OSM or
// creating them from scratch. It stores the Stops in a DB.
//
// v1.0  May 2023, see README.md for details
// ***************************************************************//
//
// we create a global APP obj here:
let APP = {
    name: "showStops",
    url: "constructstops.html",
    // needed for postREST DB access:
    authToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw",
    map: undefined,
    existingStops: undefined,
    newStops: undefined,
    osmClicked: undefined, //need this to be global
    restart: function () {
        openURLwithCurrentLocation(APP.url);
    }
};

/*-- Initialization function --*/
async function initConstructStops() {
    UI.InitMessages(true);
    UI.SetMessage("Initializing ConstructStops...", workflowMsg);
    if (DB.init('http://localhost:3000', APP.authToken)) {
        // ** step 1:
        let startAt = getURIParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            APP.map = MAP.init("ContructStopsMap", [startAt[0], startAt[1]], startAt[2], findOSMstop); //start loc from URIparams
        } else {
            APP.map = MAP.init("ContructStopsMap",[6.89, 52.22], 10, findOSMstop);  //startloc = Enschede
        }
        APP.map.StopStyle = MAP.stopStyleBlue;
        APP.map.StopSelectedStyle = MAP.stopStyleRed;
        APP.map.LegStyle = MAP.lineStyleBlue;
        APP.map.LegSelectedStyle = MAP.lineStyleRed;
        APP.map.JourneyStyle = MAP.lineStyleGrey;
        APP.map.JourneySelectedStyle = MAP.lineStyleRed;
        APP.map.displayLayer("openRailwayMap", false);
        APP.map.displayLayer("Journeys", false);
        APP.map.displayLayer("Legs", false);
        /*-- ********** -*/
        APP.existingStops = new StopsCollection(APP.map.getLayerDataByName("Stops"));
        await APP.existingStops.loadFromDB(''); // empty WHERE: should load all existing stops
        APP.existingStops.mapStops(false);
        UI.SetMessage("Click on stop in OSM map, or elsewhere to create a new stop...", workflowMsg);
        // step 1 done, waiting for mapclick to trigger step 2...
    } else {
        UI.SetMessage("Could not initialise DB connection.", errorMsg);
    }
}

/*-- end of init -*/

/*-- **************************** -*/
/*-- Workflow/Interactivity Steps:-*/
/*-- **************************** -*/


/*-- STEP 2: map was clicked, check which OSMStops are near  -*/
function findOSMstop(evt) {
    //first remove new stops and osmboxes (on legs layer) if they are shown:
    APP.map.getLayerDataByName("NewStops").clear();
    APP.map.getLayerDataByName("NewLegs").clear();
    let curZoom = APP.map.mapView.getZoom();
    UI.resetActionBtns();
    if (curZoom <= 12) {
        UI.SetMessage("Zoom in further to select stops!", errorMsg);
    } else {
        let mercClicked = evt.coordinate;
        APP.osmClicked = merc2osm(mercClicked); // OL reports lon-lat & OSM needs lat-lon
        const searchSizeBase = 25.000;
        // base = 50 works out same ca 175 pixels width (square only at equator) in all zoom levels
        // searchsize in degrees at zoomlevel 1,  halfs for every zoom step down:
        let searchSizeLon = searchSizeBase / (2 ** (curZoom - 1));
        // compensate for mercator distortion, very approx. results in approx. square on Mid European latitudes
        let searchSizeLat = searchSizeLon * 0.6666;
        let osmBbox = "(" + (APP.osmClicked[1] - searchSizeLat) + "," + (APP.osmClicked[0] - searchSizeLon) + "," +
            (APP.osmClicked[1] + searchSizeLat) + "," + (APP.osmClicked[0] + searchSizeLon) + ")";
        showOsmBboxOnMap(osmBbox, "NewLegs");
        showClickOnMap(mercClicked, "NewStops");
        // query should ALWAYS have .finalresult as the output set:
        let query = '(';
        query += 'node["railway"="station"] ' + osmBbox + ';'
        query += 'node["railway"="stop"] ' + osmBbox + ';'
        query += 'node["railway"="halt"] ' + osmBbox + ';'
        query += ')';
        query += '->.finalresult;';
        // in Utils.js:
        getOSMandDoNextstep(query, "body", showFoundStops, "workflow");
    }
}

/*-- End of STEP 2  -*/


/*-- STEP 3: List the OSMstops found and let the user choose one  -*/
function showFoundStops(json) {
    let osmObjects = json.elements;
    let numStops = osmObjects.length;
    if (numStops === 0) {
        let msgStr = "No stops existing in OSM found. Click elsewhere in map to search further, or... ";
        msgStr += "<button class='bigbutton' id='createStopFromClick'>Create non-OSM Stop at this location</button>";
        UI.SetMessage(msgStr, workflowMsg);
        let CreateBtn = document.getElementById("createStopFromClick");
        CreateBtn.addEventListener("click", function() {
            const id = Math.floor(Math.random()*99999) + 99999; // TODO: random ID is NOT guaranteed to be unique!
            const name = 'new_name';
            const coords = APP.osmClicked;
            showSaveStopForm(new Stop(id, name, coords), "workflow");
            // => /***** step 4: Create stop from click location and empty attribs ****/
        });
    } else {
        UI.SetMessage("Found " + numStops + " stops in OSM. Select the stop you want to use...", workflowMsg);
        
        const mainKeys = ["ref", "name"]; // osm keys to be listed separately (rest gets joined)
        UI.workflowPane.innerHTML = HTML.showOSMobjectsTable(osmObjects, mainKeys);
        // create onclick events for rows:
        for (let aStop of osmObjects) {
            let row = document.getElementById(aStop.id);
            row.addEventListener("click", function () {
                showSaveStopForm(new Stop(aStop.id,aStop.tags.name, [aStop.lon,aStop.lat]));
                // if row is clicked => /***** step 4: Create stop from OSM data ****/
            });
        }
    }
}
/*-- End of STEP 3  -*/

/*-- STEP 4: show form to save stop in DB: -*/
function showSaveStopForm(theStop) {
    document.getElementById("action1Btn").style.display = "none";
    document.getElementById("action2Btn").style.display = "none";
    UI.SetMessage("Fill in properties and save...", workflowMsg);
    
    // const tmpGEOJSON = JSON.stringify(theStop.geometry);
    UI.workflowPane.innerHTML = HTML.editStopForm(theStop);
    let SaveBtn = document.getElementById("SaveBtn");
    SaveBtn.addEventListener("click", function () {
        // theStop.id = document.getElementById("stop_id").value;
        theStop.name = document.getElementById("stop_name").value;
        saveStop(theStop);
        /*-- Submit of this Form will trigger STEP 5  -*/
    });
    let CancelBtn = document.getElementById("CancelBtn");
    CancelBtn.addEventListener("click", function () {
        UI.workflowPane.innerHTML = '';
        UI.SetMessage("Click on OSM stop element in the map, or click elsewhere to create a new stop...", workflowMsg);
        APP.map.getLayerDataByName("NewStops").clear(); // clear maplayer showing clickPoint
        APP.map.getLayerDataByName("NewLegs").clear(); // clear maplayer showing clickBox
        /*-- Cancelled, back to STEP 2  -*/
    });
}
/*-- End of STEP 4  -*/

/*-- STEP 5: save the constructed stop in DB: -*/
async function saveStop(theStop) {
    if (await DB.addStop(theStop.id, theStop.name, theStop.geometry) ) {
        UI.SetMessage("Saved Stop in DB.", workflowMsg);
    } else {
        UI.SetMessage("Saving Stop in DB failed. ", errorMsg);
    }
    //** ...and we go back to the end of step 1, waiting for a click in the map....
    APP.restart();
}

/*-- End of STEP 5  -*/



