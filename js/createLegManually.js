//Globals:
let myMap, mapView;
let newLegsData, stopsData, legFrom, legTo;
let tmpOSMrelation;
let allStops, allLegs; // create one global version
let preMerge = true;
let legTypes, legTypesMenu;

/*-- Initialization function --*/
async function initCreateLegManually() {
    UI.InitMessages(true);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (await DB.init('http://localhost:3000', authToken)) {
        UI.SetMessage("Initializing Creation of Leg...", workflowMsg);
        legTypes = await loadTypesFromDB(''); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
        // first load all stops for use in menus etc.
        allStops = await loadStopsFromDB(''); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
        // ** step 1:
        let OSMrelationID = getParameterByName("id");
        if (!OSMrelationID) {
            // OSMrelationID = 5117740;
            OSMrelationID = '';
        }
        let startAt = getParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            initMap([startAt[0], startAt[1]], startAt[2], selectClickedLeg); //loc from params
        } else {
            initMap([6.89, 52.22], 11, selectClickedLeg);  //Enschede
        }
        if (!OSMrelationID) {
            UI.SetMessage("Choose an OSM relation ID to manually create a Leg from:", workflowMsg);
            let showIn = document.getElementById('workflow');
            showIn.innerHTML = HTML.searchOSMrelationIDForm();
            let ShowBtn = document.getElementById("relationIdBtn");
            ShowBtn.addEventListener("click", function () {
                OSMrelationID = document.getElementById('osm_id').value;
                preMerge = document.getElementById('premerge').checked;
                searchOSMrelation(OSMrelationID);
                // ** wait for form to be submitted => step 2 =  Load OSMrelation **//
            });
        } else {
            searchOSMrelation(OSMrelationID);
            // => step 2 =  Load OSMrelation
        }
    } else {
        UI.SetMessage("Could not initialise DB connection.", errorMsg);
    }
}

/*-- end of init -*/

/*-- **************************** -*/
/*-- LOCAL FUNCTIONS:-*/
/*-- **************************** -*/

/*-- Generic function to take results of step x to query OSM and carry results to step x+1:   -*/
// in Functions.js
/*-- End of getOSMandDoNextstep  -*/

function selectNoLegs() {
    for (let aLeg of allLegs) {
        aLeg.selected = false;
    }
    mapLegs(allLegs, false, newLegsData);
}

function toggleSelect(ID) {
    for (let aLeg of allLegs) {
        if (aLeg.id === ID) {
            if (aLeg.selected) {
                aLeg.selected = false;
            } else {
                aLeg.selected = true;
            }
        }
    }
    mapLegs(allLegs, false, newLegsData);
}

// callback function for clicks in map:
function selectClickedLeg(evt) {
    // if acceptMergeBtn shown, remove it:
    if (document.getElementById("action4Btn").style.display === "inline") {
        document.getElementById("action4Btn").style.display = "none";
    };
    let idsClicked = idsFoundAtClick(myMap.getEventPixel(evt.originalEvent));
    if (idsClicked) {
        for (let ID of idsClicked) {
            for (let aLeg of allLegs) {
                if (aLeg.id === ID) {
                    if (aLeg.selected) {
                        aLeg.selected = false;
                    } else {
                        aLeg.selected = true;
                    }
                }
            }
            mapLegs(allLegs, false, newLegsData);
        }
    }
}

/*-- **************************** -*/
/*-- Workflow/Interactivity Steps:-*/
/*-- **************************** -*/

/*-- STEP 2: Load OSMrelation  -*/
async function searchOSMrelation(id) {
    let query = 'rel(' + id + ')' + ' -> .finalresult;';
    // do step 4
    getOSMandDoNextstep(query, 'geom', showChosenRelation, 'workflow');
}
/*-- End of STEP 2  -*/


/*-- STEP 3: Create OSMrelation object, zoom to it  and collect stops ids to query: -*/
function showChosenRelation(json, htmlElem) {
    //first remove stops & lines if they are shown:
    stopsData.clear();
    newLegsData.clear();
    tmpOSMrelation = undefined;
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

    // showFeatureOnMap(tmpOSMrelation.toOlFeature(), newLegsData);
    zoomMapToBbox(tmpOSMrelation.bbox);

    numStops = stops.length;
    let debugMsg = "OSMRelation has " + numTotal + " members:  ";
    debugMsg += numStops + " stops,  ";
    debugMsg += numPlatforms + " platforms,  ";
    debugMsg += numRouteParts + " RouteParts,  ";
    debugMsg += numRest + " other things;  ";
    console.log(debugMsg);

    routeGeom = tmpOSMrelation.geometry.coordinates;
    UI.SetMessage("Click in map to select/unselect parts of the route...", workflowMsg);
    showMergedParts(routeGeom, preMerge);

    let AcceptBtn = document.getElementById("action4Btn");
    AcceptBtn.value = "ACCEPT Merge & Continue";
    AcceptBtn.style.display = "none";
    AcceptBtn.addEventListener("click", function () {
        acceptMerge(mergedGeom, stops);
    });
    let ZoomBtn = document.getElementById("action1Btn");
    ZoomBtn.value = 'Zoom to selection';
    ZoomBtn.style.display = "inline";
    ZoomBtn.addEventListener("click", function () {
        // zoom to legs where .selected = true
        zoomToLegs(false);
    });
    let ResetBtn = document.getElementById("action2Btn");
    ResetBtn.value = "Reset selection";
    ResetBtn.style.display = "inline";
    ResetBtn.addEventListener("click", function () {
        selectNoLegs();
    });
    let mergedGeom = undefined;
    let MergeBtn = document.getElementById("action3Btn");
    MergeBtn.value = "MERGE selection";
    MergeBtn.style.display = "inline";
    MergeBtn.addEventListener("click", function () {
        routeGeom = [];
        for (aLeg of allLegs) {
            if (aLeg.selected) {
                routeGeom.push(aLeg.geometry.coordinates);
            }
        }
        mergedGeom = extractLineFromMultiline(routeGeom, false);
        if (mergedGeom === undefined) {
            //not successful, keep trying
            routeGeom = [];
            for (aLeg of allLegs) {
                if (aLeg.selected) {
                    routeGeom.push(aLeg.geometry.coordinates);
                }
            }
        } else {
            // succesfull, offer finalisation
            AcceptBtn.style.display = "inline";
        }
    });
}
/*-- End of STEP 3  -*/



/*-- STEP 4: Accept Merged result and continue -*/
function acceptMerge(mergedGeom, stops) {
    UI.resetActionBtns();

    tmpOSMrelation.geometry.coordinates = mergedGeom;
    allLegs = [];
    newLegsData.clear();
    showLineUnderConsideration(mergedGeom, 0)
    zoomToLegs(false);
    let numStops = stops.length;
    if (numStops === 0) {
        // ***************** //
        // directly do STEP 5
        // ***************** //
        showStops(undefined, "workflow");
    } else {
        // get refs and do another query to collect full nodes with name
        let query = '(';
        for (let stop of stops) {
            query += 'node(' + stop.ref + ');';
        }
        query += ')';
        query += '->.finalresult;';
        // ***************** //
        // get stops from OSM and do next STEP 5 with them...
        // ***************** //
        getOSMandDoNextstep(query, "geom", showStops, "workflow");
    }
}
/*-- End of STEP 4  -*/

/*-- STEP 5: Collect each Stop from OSM (because the relation did not have the stop names): -*/
// async function showStops(json, htmlElem) {
// in Functions.js
//step 5 ready. Waiting for choices and CONSTRUCT btn click to start step 6
/*-- End of STEP 5  -*/

/*-- STEP 6: Construct a Leg Object with LineString geom from start to end: -*/
function constructLeg(stopsInRel, stopFromID, stopToID, geom) {
    if (stopFromID === stopToID) {
        UI.SetMessage("Error: 'from' and 'to' stop identical!", errorMsg);
        UI.SetMessage('Aborted construction. Retry...', workflowMsg);
    } else if (stopFromID === undefined) {
        UI.SetMessage("Error: 'from' stop undefined!", errorMsg);
        UI.SetMessage('Aborted construction. Retry...', workflowMsg);
    } else if (stopToID === undefined) {
        UI.SetMessage("Error: 'to' stop undefined!", errorMsg);
        UI.SetMessage('Aborted construction. Retry...', workflowMsg);
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
/*-- End of STEP 6  -*/

/*-- STEP 7: create Leg & show btn to save: -*/
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
        //if nor found, copy stops from all Stops
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

            UI.SetMessage("Add properties & Save (or redo)...", workflowMsg);
            let SaveBtn = document.getElementById("action3Btn");
            SaveBtn.value = 'ADD PROPERTIES & SAVE';
            SaveBtn.style.display = "inline";
            SaveBtn.addEventListener("click", function () {
                // **** Go step 8:
                // let stopsToggle = document.getElementById("toggleControl");
                // if (stopsToggle) {
                //     stopsToggle.style.display = "none"; //show stops toggle
                // }
                showSaveLegForm(tmpLeg, "workflow", "createLegManually");
            });
        }
    }
}
/*-- End of STEP 7  -*/

/*-- STEP 8: show form to save leg in DB: -*/
// function showSaveLegForm(theLeg, htmlElem, comingFrom)
// in Functions.js
// if save btn used, will trigger Step 9
/*-- End of STEP 8  -*/

/*-- STEP 9: save the constructed leg in DB: -*/
// async function saveLegInDB(theLeg, comingFrom)
// in Functions.js
/*-- End of STEP 9  -*/












