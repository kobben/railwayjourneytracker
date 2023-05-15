// DRAWLEG
// this APP lets you create a Leg from amanullay drawn or imported Line geometry.
//
// v1.0  May 2023, see README.md for details
// ***************************************************************//
// ***************************************************************//
//
// we create a global APP obj here:
let APP = {
    name: "drawLegs",
    url: "drawlegs.html",
    // needed for postREST DB access:
    authToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw",
    map: undefined,
    allstops: undefined, //always need a collection of all existing stops for various tasks
    legstops: undefined, //these are the stops that are end- or startpoint of the selected legs
    fromStop: undefined,
    toStop: undefined,
    legs: undefined,
    legtypes: undefined,
    restart: function () {
        const curZoom = APP.map.mapView.getZoom();
        const curCenter = ol.proj.transform(APP.map.mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
        window.location = "./" + APP.url + "?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
    }
};

/*-- Initialization function --*/

async function initDrawLegs() {
    UI.InitMessages(true);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (await DB.init('http://localhost:3000', authToken)) {
        APP.legtypes = await DB.loadTypesFromDB('legtypes');
        // ***********
        // ** step 1:
        // ***********
        let startAt = getURIParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            APP.map = MAP.init("DrawLegsMap", [startAt[0], startAt[1]], startAt[2], null, false); //loc from params
        } else {
            // Enschede = [6.89, 52.22], 11
            // Frankfurt = [8.64, 50.08], 11
            APP.map = MAP.init("DrawLegsMap", [8.64, 50.08], 12, null, true);
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
        APP.allstops = new StopsCollection(APP.map.getLayerDataByName("Stops"));
        await APP.allstops.loadFromDB(''); //empty WhereStr makes that ALL stops are loaded.
        /*-- ***********/
        // ** step 2:
        // ***********
        showSearchLegsForm(true, false, true, chooseStopsForDrawing); // in Utils.js
        // ** wait for form to be submitted
        //  returns with APP.legs + APP.legstops set
        //   ==> step 4: choos Stops
        // ***********
        UI.SetMessage("Select existing Legs to show, or Skip...", workflowMsg);
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
                showSearchLegsForm(true, false, true, chooseStopsForDrawing); // in Utils.js
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


/*-- STEP 4 ********************** -*/
/* choose Stops: show them in a menu to choose from and create  "Draw" and "Import" buttons: -*/
function chooseStopsForDrawing() {
    UI.hideActionBtns();
    APP.allstops.mapStops(false);
    UI.SetMessage("Select start and end Stops and then click DRAW or the IMPORT button...", workflowMsg);
    UI.workflowPane.innerHTML = HTML.drawLegForm(APP.allstops);
    // first create eventlisteners for menu btns and opetion lists:
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
    let RefreshStopsBtn = document.getElementById("RefreshStopsBtn");
    RefreshStopsBtn.addEventListener("click", async function () {
        await APP.allstops.loadFromDB(''); // 'where' uses PostGREST syntax, empty select all
        APP.allstops.selectStops(0); // all off
        chooseStopsForDrawing(); //just restart this function...
    });
    // then create Action btns:
    UI.resetActionBtns();
    let CancelBtn = document.getElementById("action1Btn");
    CancelBtn.value = 'Cancel';
    CancelBtn.style.display = "inline";
    CancelBtn.addEventListener("click", async function () {
        APP.restart();
    });
    let ImportBtn = document.getElementById("action2Btn");
    ImportBtn.value = 'IMPORT Leg';
    ImportBtn.style.display = "inline";
    ImportBtn.addEventListener("click", function () {
        doImportLeg();
    });
    let DrawBtn = document.getElementById("action3Btn");
    DrawBtn.value = 'DRAW Leg';
    DrawBtn.style.display = "inline";
    DrawBtn.addEventListener("click", function () {
        doDrawLeg();
    });
    UI.showActionBtns();
}
/// TWO utility functions to allow choosing from and to staps from Stops
//  existing in DB, using the pulldown menu created in HTML.createStopsOptions()
function pickFromStop(id, name) {
    let theFromStop;
    for (let aStop of APP.allstops.getStops()) { // first check if OSM relation stop
        if (parseInt(aStop.id) === parseInt(id)) { // id might be stored as Str!
            theFromStop = aStop;
        }
    }
    if (theFromStop === undefined) {
        UI.SetMessage("Unexpected ERROR: chosen stop is not found in DB!", errorMsg);
    } else {
        if (APP.fromStop) { //if already a tfromStop selected, unselect it first
            APP.fromStop.selectOnMap(false, APP.map.getLayerDataByName("Stops"));
        }
        APP.fromStop = theFromStop;
        APP.fromStop.selectOnMap(true, APP.map.getLayerDataByName("Stops"));
    }

}
function pickToStop(id, name) {
    let theToStop;
    for (let aStop of APP.allstops.getStops()) { // first check if OSM relation stop
        if (parseInt(aStop.id) === parseInt(id)) { // id might be stored as Str!
            theToStop = aStop;
        }
    }
    if (theToStop === undefined) {
        UI.SetMessage("Unexpected ERROR: chosen stop is not found in DB!", errorMsg);
    } else {
        if (APP.toStop) { //if already a toStop selected, unselect it first
            APP.toStop.selectOnMap(false, APP.map.getLayerDataByName("Stops"));
        }
        APP.toStop = theToStop;
        APP.toStop.selectOnMap(true, APP.map.getLayerDataByName("Stops"));
    }
}
// end of utility functions
/*-- End of STEP 4  -*/

/*-- STEP 5a: DrawLeg Code, based on:
        https://openlayers.org/en/latest/examples/draw-features.html
-*/
function doDrawLeg() {
    if (APP.fromStop === undefined) {
        UI.SetMessage('Must select a start Stop!', errorMsg);
    } else if (APP.toStop === undefined) {
        UI.SetMessage('Must select an end Stop!', errorMsg);
    } else {
        UI.SetMessage("Click in map to add vertex. Click last vertex again to end...", workflowMsg);
        APP.map.mapObj.addInteraction(APP.map.mapDraw); // defined in MAP object
        UI.resetActionBtns();
        let UndoBtn = document.getElementById("action2Btn");
        UndoBtn.value = 'UNDO last vertex';
        UndoBtn.style.display = "inline";
        UndoBtn.addEventListener("click", function () {
            APP.map.mapDraw.removeLastPoint();
        });
        let CancelBtn = document.getElementById("action3Btn");
        CancelBtn.value = 'CANCEL drawing';
        CancelBtn.style.display = "inline";
        CancelBtn.addEventListener("click", function () {
            APP.map.mapDraw.dispatchEvent('drawend');
            APP.map.getLayerDataByName("NewLegs").clear();
            APP.toStop.selectOnMap(false, APP.map.getLayerDataByName("Stops"));
            APP.fromStop.selectOnMap(false, APP.map.getLayerDataByName("Stops"));
            APP.fromStop = undefined;
            APP.toStop = undefined;
            chooseStopsForDrawing(); // ==> go back to step 3
        });
        UI.showActionBtns();
        UI.workflowPane.innerHTML = '';
        UI.showHover = false;
        APP.map.mapDraw.on('drawend', stopDrawing);
        // will now be in drawing mode until last vertex clicked again
        // OR if user clicks ReadyBth (see UI_DrawMode)
        //  => step 6a
    }
}
/*-- End of STEP 5a  -*/

/*-- STEP 6a: when drawing ends, collect results...
-*/
function stopDrawing() {
    APP.map.mapObj.removeInteraction(APP.map.mapDraw);
    UI.resetActionBtns();
    UI.showHover = true;
    let CancelBtn = document.getElementById("action1Btn");
    CancelBtn.value = 'Cancel';
    CancelBtn.style.display = "inline";
    CancelBtn.addEventListener("click", function () {
        APP.map.getLayerDataByName("NewLegs").clear();
        APP.toStop.selectOnMap(false, APP.map.getLayerDataByName("Stops"));
        APP.fromStop.selectOnMap(false, APP.map.getLayerDataByName("Stops"));
        APP.fromStop = undefined;
        APP.toStop = undefined;
        chooseStopsForDrawing(); // ==> go back to step 3
    });
    let SaveLegBtn = document.getElementById("action2Btn");
    SaveLegBtn.value = 'SAVE as Leg';
    SaveLegBtn.style.display = "inline";
    SaveLegBtn.addEventListener("click", function () {
        for (let drawnLine of APP.map.getLayerDataByName("NewLegs").getFeatures()) { //normally should be only 1!
            let geom = drawnLine.getGeometry().transform('EPSG:3857', 'EPSG:4326').getCoordinates();
            // console.log(geom.toString());
            createDrawnLeg(geom);
        }
    });
}

/*-- End of STEP 6  -*/


/*-- STEP 5b: ImportLeg
-*/
function doImportLeg() {
    if (APP.fromStop === undefined) {
        UI.SetMessage('Must select a start Stop!', errorMsg);
    } else if (APP.toStop === undefined) {
        UI.SetMessage('Must select an end Stop!', errorMsg);
    } else {
        UI.SetMessage("Import Leg geometry...", workflowMsg);
        UI.hideActionBtns();
        ///TODO: also have file loading button??
        UI.workflowPane.innerHTML = HTML.importLegForm();
        let CancelBtn = document.getElementById("CancelBtn");
        CancelBtn.addEventListener("click", function () {
            APP.map.getLayerDataByName("NewLegs").clear();
            APP.toStop.selectOnMap(false, APP.map.getLayerDataByName("Stops"));
            APP.fromStop.selectOnMap(false, APP.map.getLayerDataByName("Stops"));
            APP.fromStop = undefined;
            APP.toStop = undefined;
            chooseStopsForDrawing(); // ==> go back to step 3
        });
        let ImportBtn = document.getElementById("ImportBtn");
        ImportBtn.addEventListener("click", function () {
            let geoJSONStr = document.getElementById('geom').value;
            let importGeoJSON;
            let isValid = true;
            let errStr = 'ERROR:\n';
            try {
                importGeoJSON = JSON.parse(geoJSONStr);
            } catch (e) {
                isValid = false;
                errStr += e + '].\n';
                UI.SetMessage(errStr, errorMsg);
            }
            if (isValid) {
                if (importGeoJSON.type !== "FeatureCollection") {
                    isValid = false;
                    errStr += 'Input does not seem to be a GeoJSON FeatureCollection.\n';
                } else if (importGeoJSON.features.length !== 1) {
                    isValid = false;
                    errStr += 'There should be exactly 1 Feature in FeatureCollection.\n';
                } else if (importGeoJSON.features[0].geometry.type !== "LineString") {
                    isValid = false;
                    errStr += 'Feature is not a LineString.\n';
                }
                if (isValid) {
                    createDrawnLeg(importGeoJSON.features[0].geometry.coordinates);
                } else {
                    UI.SetMessage(errStr, errorMsg);
                }
            }
            // ** wait for form to be submitted => go direct to step 7
        });
    }
}
/*-- End of STEP 5b  -*/

/*-- STEP 7: create Leg & show btn to save: -*/
function createDrawnLeg(geom) {
    if (geom === undefined || geom === null || geom === '') {
        UI.SetMessage("Error: No Geometry. Could not construct valid Line from drawing.", errorMsg);
        UI.SetMessage('Aborted construction', workflowMsg);
    } else {
        UI.SetMessage('Constructing Leg object...', workflowMsg);
        // truncate geometry from stopFrom to StopTo:
        let legGeom = extractLegFromLine(geom, APP.fromStop.geometry.coordinates, APP.toStop.geometry.coordinates);
        //temp name & id, UID will be created by DB if saved:
        let tmpID = 999999; // will be changed by Postgres to serial ID
        let newLeg = new Leg(tmpID, legGeom, APP.fromStop, APP.toStop, '', '', '', 0, false);
        newLeg.bbox = calcBbox(newLeg.geometry.coordinates);
        // console.log(tmpLeg);
        APP.map.getLayerDataByName("NewLegs").clear();
        newLeg.showOnMap(APP.map.getLayerDataByName("NewLegs"));
        MAP.zoomToBbox(newLeg.bbox);
        showSaveLegForm(newLeg, UI.workflowPane, "drawlegs");
    }
}

/*-- End of STEP 7  -*/

/*-- STEP 8: show form to save leg in DB: -*/
// function showSaveLegForm(theLeg, htmlElem)
// in Utils.js
// the SAVE btn in this triggers STEP X+1+1
/*-- End of STEP 8  -*/

/*-- STEP 9: save the constructed leg in DB: -*/
// async function saveLegInDB(theLeg)
// in Utils.js
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
        let IDselect = document.getElementById("select_" + id);
        if (IDselect) { //exists in list
            toggleSelect(id); //toggle in list object
            IDselect.checked = IDselect.checked !== true;
        }
    }
}

function selectAllStops() {
    for (let aStop of allStops.getStops()) {
        let isRowInTable = document.getElementById("select_" + aStop.id);
        if (isRowInTable) {
            aStop.selected = true;
            isRowInTable.checked = true;
        }
    }
    mapStops(allStops.getStops());
}

function selectNoStops() {
    for (let aStop of allStops.getStops()) {
        let isRowInTable = document.getElementById("select_" + aStop.id);
        if (isRowInTable) {
            aStop.selected = false;
            isRowInTable.checked = false;
        }
    }
    mapStops(allStops.getStops());
}

function toggleSelect(ID) {
    for (let aStop of allStops.getStops()) {
        if (aStop.id === ID) {
            aStop.selected = !aStop.selected;
        }
    }
    mapStops(allStops.getStops());
}

//zoom to bbox of set of objects that have a BBox:
function zoomToStops(zoomtoAll = true) {
    let warnings = 0;
    let bboxChanged = false;
    let minlat = 90;
    let minlon = 180;
    let maxlat = -90;
    let maxlon = -180;
    for (let aStop of allStops.getStops()) {
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
    if (bboxChanged) MAP.zoomToBbox([minlat, minlon, maxlat, maxlon]);
    if (warnings !== 0) UI.SetMessage("WARNING: ' + warnings + ' objects have no (valid) coordinates!", errorMsg);
}
