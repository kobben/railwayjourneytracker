//Globals:
let myMap, mapView;
let newLegsData, legsData, stopsData;
let stopFromID, stopToID;
let coordsFrom, coordsTo;
let allStops, allLegs; // create one global version;
let draw;  // global so we can remove it later
let legTypes, legTypesMenu;

/*-- Initialization function --*/
async function initDrawLegs() {
    UI.InitMessages(true);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (DB.init('http://localhost:3000', authToken)) {
        UI.SetMessage("Initializing leg drawing...", workflowMsg);
        legTypes = await loadTypesFromDB(''); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
        // first load all stops for use in menus etc.
        allStops = await loadStopsFromDB(''); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
        let startAt = getParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            initMap([startAt[0], startAt[1]], startAt[2], selectClickedStop); //location from params
        } else {
            initMap([14.0, 48.5], 5, selectClickedStop); //Europe
        }
        /*-- ********** -*/
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
    doStopSelection();
}

/*-- End of STEP 3  -*/


/*-- STEP 3: shows all stops in to and from menu:  -*/
function doStopSelection() {
    stopFromID = undefined; stopToID = undefined;
    newStopsData.clear();
    UI.SetMessage("Select stops to draw Leg between...", workflowMsg);
    mapLegs(allLegs, false, legsData);
    mapStops(allStops);
    let showIn = document.getElementById('workflow');
    makeStopsMenu(showIn, 0); // 0 to force all stops to show
    UI.resetActionBtns();
    let DrawBtn = document.getElementById("action4Btn");
    DrawBtn.value = 'DRAW Leg';
    DrawBtn.style.display = "inline";
    DrawBtn.addEventListener("click", function () {
        drawLeg(); //start drawing mode
    });
    // create refreshStopsBtn:
    let refreshStopsBtn = document.getElementById("action2Btn");
    refreshStopsBtn.value = 'REFRESH Stops menus';
    refreshStopsBtn.style.display = "inline";
    refreshStopsBtn.addEventListener("click", async function () {
        allStops = await loadStopsFromDB(''); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
        mapStops(allStops);
        makeStopsMenu(showIn, 0);
    });
}
/*-- End of STEP 5  -*/

/*-- STEP 5: DrawLeg Code, based on:
        https://openlayers.org/en/latest/examples/draw-features.html
-*/
function drawLeg() {
    if (stopFromID === undefined) {
        UI.SetMessage('Must select a start Stop!', errorMsg);
    } else if (stopFromID === undefined) {
        UI.SetMessage('Must select an end Stop!', errorMsg);
    } else {
        UI.SetMessage("Click in map to add vertex. Click last vertex again to end...", workflowMsg);
        myMap.addInteraction(draw);
        UI.resetActionBtns();
        let UndoBtn = document.getElementById("action2Btn");
        UndoBtn.value = 'UNDO last vertex';
        UndoBtn.style.display = "inline";
        UndoBtn.addEventListener("click", function () {
            draw.removeLastPoint();
        });
        let CancelBtn = document.getElementById("action3Btn");
        CancelBtn.value = 'CANCEL drawing';
        CancelBtn.style.display = "inline";
        CancelBtn.addEventListener("click", function () {
            draw.dispatchEvent('drawend');
            newLegsData.clear();
            stopFromID = undefined; stopToID = undefined;
            newStopsData.clear();
            doStopSelection(); // ==> go back to step 3
        });
        UI.showHover = false;
        draw.on('drawend', stopDrawing); // in  drawleg.js
        // will now be drawing until last vertex clicked again
        // OR if user clicks ReadyBth (see UI_DrawMode)
        //  => step 5
    }
}
/*-- End of STEP 5  -*/


/*-- STEP 6: when drawing ends, collect results...
-*/
function stopDrawing() {
    myMap.removeInteraction(draw);
    UI.resetActionBtns();
    UI.showHover = true;
    let CancelBtn = document.getElementById("action1Btn");
    CancelBtn.value = 'Cancel';
    CancelBtn.style.display = "inline";
    CancelBtn.addEventListener("click", function () {
        newLegsData.clear();
        stopFromID = undefined; stopToID = undefined;
        newStopsData.clear();
        doStopSelection(); // ==> go back to step 3
    });
    let SaveLegBtn = document.getElementById("action2Btn");
    SaveLegBtn.value = 'SAVE as Leg';
    SaveLegBtn.style.display = "inline";
    SaveLegBtn.addEventListener("click", function () {
        let drawnLine;
        for (drawnLine of newLegsData.getFeatures()) { //normally should be only 1!
            let geom = drawnLine.getGeometry().transform('EPSG:3857', 'EPSG:4326').getCoordinates();
            console.log(geom);
            createDrawnLeg(geom);
        }
    });
}
/*-- End of STEP 6  -*/


/*-- STEP 7: create Leg & show btn to save: -*/
function createDrawnLeg(geom) {
    if (geom === undefined || geom === null || geom === '') {
        UI.SetMessage("Error: No Geometry. Could not construct valid Line from drawing.", errorMsg);
        UI.SetMessage('Aborted construction', workflowMsg);
    } else {
        let legGeom = geom;
        // first remove stops & lines from map:
        stopsData.clear();
        newLegsData.clear();
        //temp name & id, UID will be created by DB if saved:
        let tmpID = 444444; // will be changed by Postgres to serial ID
        let tmpLeg = undefined;
        tmpLeg = new Leg(tmpID,'drawnLeg', legGeom, undefined, undefined, null,
            null, '', '', '');
        let stopFromAdded = false;
        let stopToAdded = false;
        for (let stop of allStops) {
            if (stop.id === stopFromID) {
                tmpLeg.stopFrom = stop;
                stopFromAdded = true;
            }
            if (stop.id === stopToID) {
                tmpLeg.stopTo = stop;
                stopToAdded = true;
            }
        }
        if (!stopFromAdded || !stopToAdded) {
            UI.SetMessage("From and/or To stops could not be created correctly...", errorMsg);
        } else {
            // truncate geometry from stopFrom to StopTo:
            tmpLeg.geometry.coordinates = extractLegFromLine(geom, tmpLeg.stopFrom.geometry.coordinates, tmpLeg.stopTo.geometry.coordinates);
            tmpLeg.bbox = calcBbox(tmpLeg.geometry.coordinates);
            // console.log(myLeg);
            showFeatureOnMap(tmpLeg.toOlFeature(), newLegsData);
            showFeatureOnMap(tmpLeg.stopFrom.toOlFeature(), stopsData);
            showFeatureOnMap(tmpLeg.stopTo.toOlFeature(), stopsData);
            zoomMapToBbox(tmpLeg.bbox);
            showSaveLegForm(tmpLeg, "workflow", "drawingleg");
        }
    }
}
/*-- End of STEP 7  -*/

/*-- STEP 8: show form to save leg in DB: -*/
// function showSaveLegForm(theLeg, htmlElem)
// in Functions.js
// the SAVE btn in this triggers STEP X+1+1
/*-- End of STEP 8  -*/

/*-- STEP 9: save the constructed leg in DB: -*/
// async function saveLegInDB(theLeg)
// in Functions.js
/*-- End of STEP 9  -*/


/*-- **************************** -*/
/*-- OTHER FUNCTIONS :-*/
/*-- **************************** -*/


// callback function for clicks in map: will trigger STEP 4: toggling selection of clicked stops

// callback function for clicks in map: will trigger STEP 4: toggling selection of clicked stops
function selectClickedStop(evt) {
    let idsClicked = idsFoundAtClick(myMap.getEventPixel(evt.originalEvent));
    if (idsClicked) {
        toggleClickedFeatures(idsClicked);
    }
}

/*--   -*/
function toggleClickedFeatures(ids) {
    for (let id of ids) {
        let IDselect = document.getElementById("select_"+id);
        if (IDselect) { //exists in list
            toggleSelect(id); //toggle in list object
            if (IDselect.checked === true) { //toggle in table
                IDselect.checked = false;
            } else {
                IDselect.checked = true;
            }
        }
    }
}

function displayInTable(theStops, htmlElem) {
    let showIn = document.getElementById(htmlElem);
    let html = '<table class="tableFixHead"><tr><thead><th>ID</th><th>Name</th>';
    html += '<th>Selected</th>';
    html += '<th><input type="button" onclick="selectNoStops()"  value="None"/></th>';
    html += '<th><input type="button" onclick="selectAllStops()" value="All"/></th>';
    html += '</thead></tr>';
    for (let aStop of theStops) {
        html += HTML.showStopRow(aStop);
    }
    html += '<tr><th colspan="10"></th></tr></table>';
    showIn.innerHTML = html;
}

function selectAllStops() {
    for (let aStop of theStops) {
        let isRowInTable = document.getElementById("select_" + aStop.id);
        if (isRowInTable) {
            aStop.selected = true;
            isRowInTable.checked = true;
        }
    }
    mapStops(theStops);
}

function selectNoStops() {
    for (let aStop of theStops) {
        let isRowInTable = document.getElementById("select_" + aStop.id);
        if (isRowInTable) {
            aStop.selected = false;
            isRowInTable.checked = false;
        }
    }
    mapStops(theStops);
}

function toggleSelect(ID) {
    for (let aStop of theStops) {
        if (aStop.id === ID) {
            if (aStop.selected) {
                aStop.selected = false;
            } else {
                aStop.selected = true;
            }
        }
    }
    mapStops(theStops);
}

//zoom to bbox of set of objects that have a BBox:
function zoomToStops(zoomtoAll = true) {
    let warnings = 0;
    let bboxChanged = false;
    let minlat = 90;
    let minlon = 180;
    let maxlat = -90;
    let maxlon = -180;
    for (let aStop of theStops) {
        if (aStop.geometry.coordinates) {
            if (zoomtoAll || aStop.selected) {
                bboxChanged = true;
                if (aStop.geometry.coordinates[1] < minlat) minlat = aStop.geometry.coordinates[1];
                if (aStop.geometry.coordinates[0] < minlon) minlon = aStop.geometry.coordinates[0];
                if (aStop.geometry.coordinates[1] > maxlat) maxlat = aStop.geometry.coordinates[1];
                if (aStop.geometry.coordinates[0] > maxlon) maxlon = aStop.geometry.coordinates[0]
            }
        } else {
            warnings++;
        }
    }
    // console.log([minlat, minlon, maxlat, maxlon]);
    if (bboxChanged) zoomMapToBbox([minlat, minlon, maxlat, maxlon]);
    if (warnings !== 0) UI.SetMessage("WARNING: ' + warnings + ' objects have no (valid) coordinates!", errorMsg);
}
