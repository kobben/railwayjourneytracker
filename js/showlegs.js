// ***************************************************************//
// SHOWLEGS
// this APP lets you search Legs in a DB, edit/update, and delete them.
//
// v1.0  May 2023, see README.md for details
// ***************************************************************//
//
// we create a global APP obj here:
let APP = {
    name: "showLegs",
    url: "showlegs.html",
    // needed for postREST DB access:
    authToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw",
    map: undefined,
    allstops: undefined, //always need a collection of all existing stops for various tasks
    legstops: undefined, //these are the stops that are end- or startpoint of the selected legs
    legs: undefined,
    legtypes: undefined,
    restart: function () {
        const curZoom = APP.map.mapView.getZoom();
        const curCenter = ol.proj.transform(APP.map.mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
        window.location = "./" + APP.url + "?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
    }
};

/*-- Initialization function --*/
async function initShowLegs() {
    UI.InitMessages(true);
    UI.SetMessage("Initializing showLegs APP...", workflowMsg);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (await DB.init('http://localhost:3000', authToken)) {
        APP.legtypes = await DB.loadTypesFromDB('legtypes'); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
        // ***********
        // ** step 1:
        // ***********
        let startAt = getURIParameterByName("start");
        let initialLegID = getURIParameterByName("id");
        if (startAt) {
            startAt = startAt.split(",");
            APP.map = MAP.init("ShowLegsMap", [startAt[0], startAt[1]], startAt[2], selectClickedLeg); //loc from params
        } else {
            APP.map = MAP.init("ShowLegsMap", [6.89, 52.22], 11, selectClickedLeg);  //Enschede
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
        APP.allstops = new StopsCollection(APP.map.getLayerDataByName("NewStops")); // if mapped, then on NewStops layer!
        await APP.allstops.loadFromDB(''); //empty WhereStr makes that ALL stops are loaded.
        /*-- ********** -*/
        // ** step 2:
        // ***********
        if (initialLegID) {
            let theWhereStr = 'id=eq.' + initialLegID;
            doLegsSearchAndShow(theWhereStr, true, true, true, null);
        }
        showSearchLegsForm(false, true, true); // in Utils.js
        UI.SetMessage("Search for Legs in DB...", workflowMsg);
        // ** wait for form to be submitted
        //  returns with APP.legs + APP.legstops set
        //   ==> step 3:  create various menus
        // ***********
        let NewSearchBtn = document.getElementById("action1Btn");
        NewSearchBtn.value = 'New DB Search';
        NewSearchBtn.style.display = "inline";
        NewSearchBtn.addEventListener("click",  function () {
            if (APP.legs === undefined || APP.legs === null) {
                // no search yet, so ignore this btn
            } else { //new search of leg
                APP.legs.clearMap();
                APP.legs = undefined;
                APP.legstops.clearMap();
                APP.legstops = undefined;
                APP.legs = new LegsCollection(APP.map.getLayerDataByName("Legs"));
                APP.legstops = new StopsCollection(APP.map.getLayerDataByName("Stops"));
                APP.map.getLayerDataByName("NewLegs").clear();
                APP.map.getLayerDataByName("NewStops").clear();
                showSearchLegsForm(false,true, true); // in Utils.js
                UI.SetMessage("Search for Legs in DB...", workflowMsg);
            }
        });
        let CopyBtn = document.getElementById("action2Btn");
        CopyBtn.value = 'Copy';
        CopyBtn.style.display = "inline";
        CopyBtn.addEventListener("click", function () {
            copySelectedLeg();
        });
        let ReverseBtn = document.getElementById("action3Btn");
        ReverseBtn.value = 'Reverse';
        ReverseBtn.style.display = "inline";
        ReverseBtn.addEventListener("click", function () {
            reverseSelectedLeg();
        });
        let MergeBtn = document.getElementById("action4Btn");
        MergeBtn.value = 'Merge';
        MergeBtn.style.display = "inline";
        MergeBtn.addEventListener("click", function () {
            mergeSelectedLegs();
        });
        let TruncateBtn = document.getElementById("action5Btn");
        TruncateBtn.value = 'Truncate';
        TruncateBtn.style.display = "inline";
        TruncateBtn.addEventListener("click", function () {
            truncateSelectedLeg();
        });
    } else {
        UI.SetMessage("Could not initialise DB connection.", errorMsg);
    }
}

/*-- end of init -*/

/*-- **************************** -*/
/*-- Workflow/Interactivity Steps:-*/
/*-- **************************** -*/

// callback function for clicks in map: will trigger STEP 4: toggling selection of clicked legs
function selectClickedLeg(evt) {
    let idsClicked = MAP.idsFoundAtClick(evt);
    if (idsClicked) {
        toggleClickedFeatures(idsClicked);
    }
}

/*--  STEP 4 : toggling legs clicked in the map -*/
function toggleClickedFeatures(ids) {
    for (let id of ids) {
        let IDselect = document.getElementById("select_" + id);
        if (IDselect) { //exists in list
            APP.legs.selectLegs(id);
        }
    }
}

function copySelectedLeg() {
    try {
        if (APP.legs.getSelectedLegs().length !== 1) {
            UI.SetMessage("Select (only) 1 Leg...!", errorMsg);
        } else {
            let leg1 = APP.legs.getSelectedLegs()[0];
            const copyNote = '[Copy of Leg ' + leg1.id + ']\n' + leg1.notes;
            let tmpLeg;
            let tmpID = 5555555; // will be changed by Postgres to serial ID
            if (reuseDateTime()) {
                tmpLeg = new Leg(tmpID, leg1.geometry.coordinates, leg1.stopFrom, leg1.stopTo, leg1.startDateTime, leg1.endDateTime, copyNote, leg1.type, leg1.timesequential);
            } else {
                tmpLeg = new Leg(tmpID, leg1.geometry.coordinates, leg1.stopFrom, leg1.stopTo, '', '', copyNote, leg1.type, false);
            }
            APP.legs.selectLegs(0); // unselect all legs
            tmpLeg.bbox = calcBbox(tmpLeg.geometry.coordinates);
            tmpLeg.showOnMap(APP.map.getLayerDataByName("NewLegs"));
            UI.SetMessage("Copied selected Leg...", workflowMsg);
            showSaveLegForm(tmpLeg, "workflow", "copyleg");
        }
    } catch (e) {
        UI.SetMessage("First search and select (only) 1 Leg...!", errorMsg);
    }
}

function reverseSelectedLeg() {
    try {
        if (APP.legs.getSelectedLegs().length !== 1) {
            UI.SetMessage("Select (only) 1 Leg...!", errorMsg);
        } else {
            let leg1 = APP.legs.getSelectedLegs()[0];
            UI.SetMessage("Creating return over selected Leg...", workflowMsg);
            const reverseNote = '[Return trip created from Leg ' + leg1.id + ']\n' + leg1.notes;
            let tmpLeg;
            let tmpID = 666666; // will be changed by Postgres to serial ID
            if (reuseDateTime()) {
                tmpLeg = new Leg(tmpID, leg1.geometry.coordinates, leg1.stopTo, leg1.stopFrom, leg1.startDateTime, leg1.endDateTime, reverseNote, leg1.type, leg1.timesequential);
            } else {
                tmpLeg = new Leg(tmpID, leg1.geometry.coordinates, leg1.stopTo, leg1.stopFrom, '', '', reverseNote, leg1.type, false);
            }
            APP.legs.selectLegs(0); // unselect all legs
            tmpLeg.bbox = calcBbox(tmpLeg.geometry.coordinates);
            tmpLeg.showOnMap(APP.map.getLayerDataByName("NewLegs"));
            UI.SetMessage("Created return Leg...", workflowMsg);
            showSaveLegForm(tmpLeg, "workflow", "reverseleg");
        }
    } catch (e) {
        UI.SetMessage("First search and select (only) 1 Leg...!", errorMsg);
    }
}

function truncateSelectedLeg() {
    try {
        let stopFromID = undefined;
        let stopToID = undefined;
        if (APP.legs.getSelectedLegs().length !== 1) {
            UI.SetMessage("Select (only) 1 Leg...!", errorMsg);
        } else {
            let leg1 = APP.legs.getSelectedLegs()[0];
            MAP.zoomToBbox(leg1.bbox);
            UI.SetMessage("Select existing stops to truncate Leg at...", workflowMsg);
            APP.allstops.mapStops(false);
            UI.hideActionBtns();
            UI.workflowPane.innerHTML = HTML.truncateStopsForm(APP.allstops);
            let selectFromMenu = document.getElementById("menu_from");
            selectFromMenu.addEventListener("change", function () {
                APP.allstops.selectStops(0); // all off
                stopFromID = parseInt(selectFromMenu.value);
                APP.allstops.selectStops(stopFromID);
                // also keep highlighting stopTo if already chosen!
                if (stopToID) APP.allstops.selectStops(stopToID);
            });
            let selectToMenu = document.getElementById("menu_to");
            selectToMenu.addEventListener("change", function () {
                APP.allstops.selectStops(0); // all off
                stopToID = parseInt(selectToMenu.value);
                APP.allstops.selectStops(stopToID);
                // also keep highlighting stopFrom if already chosen!
                if (stopFromID) APP.allstops.selectStops(stopFromID);
            });
            // create truncate button:
            let TruncateBtn = document.getElementById("TruncateBtn");
            TruncateBtn.addEventListener("click", function () {
                doTruncateLeg(leg1, stopFromID, stopToID);
            });
            // create refreshStopsBtn:
            let RefreshStopsBtn = document.getElementById("RefreshStopsBtn");
            RefreshStopsBtn.addEventListener("click", async function () {
                await APP.allstops.loadFromDB(''); // 'where' uses PostGREST syntax, empty select all
                APP.allstops.selectStops(0); // all off
                truncateSelectedLeg(); //just restart this function...
            });
            // create cancelBtn:
            let CancelBtn = document.getElementById("CancelBtn");
            CancelBtn.addEventListener("click", async function () {
                APP.map.getLayerDataByName("NewLegs").clear();
                APP.map.getLayerDataByName("NewStops").clear();
                UI.SetMessage("Cancelled. Click in map or table to alter selection...", workflowMsg);
                // redo original search
                UI.showActionBtns();
                doLegsSearchAndShow(APP.legs.getWhereStr(), true, true, false);
            });
        }
    } catch (e) {
        UI.SetMessage("First search and select (only) 1 Leg...!", errorMsg);
        console.log("ERROR: " + e);
    }
//Waiting for choices and TRUNCATE btn click to start next step: doTruncateLeg()
}

function doTruncateLeg(originalLeg, stopFromID, stopToID) {
    UI.SetMessage("Truncating Leg...", workflowMsg);
    APP.legs.selectLegs(0); // unselect all legs
    const copyNote = '[Truncated version of Leg ' + originalLeg.id + ']\n' + originalLeg.notes;
    let tmpLeg;
    let tmpID = 121212; // will be changed by Postgres to serial ID
    if (reuseDateTime()) {
        tmpLeg = new Leg(tmpID, originalLeg.geometry.coordinates, undefined, undefined, originalLeg.startDateTime, originalLeg.endDateTime, copyNote, originalLeg.type, originalLeg.timesequential);
    } else {
        tmpLeg = new Leg(tmpID, originalLeg.geometry.coordinates, undefined, undefined, '', '', copyNote, originalLeg.type, false);
    }
    //first get stop objects from DB
    let stopFromAdded = false;
    let stopToAdded = false;
    //copy stops from all Stops
    for (let aStop of APP.allstops.getStops()) {
        if (aStop.id === stopFromID && stopToID !== stopFromID) {
            tmpLeg.stopFrom = aStop;
            stopFromAdded = true;
        }
        if (aStop.id === stopToID && stopToID !== stopFromID) {
            tmpLeg.stopTo = aStop;
            stopToAdded = true;
        }
    }
    if (!stopFromAdded || !stopToAdded) {
        UI.SetMessage("From and/or To stops could not be created correctly.\nCheck if both are selected and are different...", errorMsg);
    } else {
        tmpLeg.geometry.coordinates = extractLegFromLine(tmpLeg.geometry.coordinates, tmpLeg.stopFrom.geometry.coordinates, tmpLeg.stopTo.geometry.coordinates);
        tmpLeg.bbox = calcBbox(tmpLeg.geometry.coordinates);
        MAP.zoomToBbox(tmpLeg.bbox);
        tmpLeg.showOnMap(APP.map.getLayerDataByName("NewLegs"));
        APP.allstops.clearMap(); // first remove allStops from map:
        tmpLeg.stopFrom.showOnMap(APP.map.getLayerDataByName("NewStops"));
        tmpLeg.stopTo.showOnMap(APP.map.getLayerDataByName("NewStops"));
        UI.SetMessage("Truncated Leg. Add properties & Save...", workflowMsg);
        showSaveLegForm(tmpLeg, "workflow", "truncateleg");
    }
}

function mergeSelectedLegs() {
    try {
        if (APP.legs.getSelectedLegs().length !== 2) {
            UI.SetMessage("Can only merge 2 Legs at a time...!", errorMsg);
        } else {
            let leg1 = APP.legs.getSelectedLegs()[1];
            let leg2 = APP.legs.getSelectedLegs()[0];
            UI.SetMessage("Merging legs...", workflowMsg);

            // first figure out how the two are connected by measuring shortest distance
            const d12 = turf.distance(turf.point(leg1.stopTo.geojson.coordinates), turf.point(leg2.stopFrom.geojson.coordinates), {units: 'degrees'});
            const d21 = turf.distance(turf.point(leg2.stopTo.geojson.coordinates), turf.point(leg1.stopFrom.geojson.coordinates), {units: 'degrees'});
            if (d12 > d21) { // if not then do nothing, order leg1 -> leg2 is correct
                // otherwise change order leg2 -> leg1
                leg1 = APP.legs.getSelectedLegs()[0];
                leg2 = APP.legs.getSelectedLegs()[1];
            }
            APP.legs.selectLegs(0); // unselect all legs
            // now show possible different merger types to user and let user choose.
            // TODO: is this really robust? I doubt it...
            let mOptions = [];
            mOptions[0] = leg1.geometry.coordinates.concat(leg2.geometry.coordinates);
            mOptions[1] = reverseLineGeom(leg1.geometry.coordinates).concat(leg2.geometry.coordinates);
            mOptions[2] = leg1.geometry.coordinates.concat(reverseLineGeom(leg2.geometry.coordinates));
            mOptions[3] = reverseLineGeom(leg1.geometry.coordinates).concat(reverseLineGeom(leg2.geometry.coordinates));
            let mChosen = 0;
            showTmpGeomOnMap(mOptions[mChosen]);
            let Msg = 'Choose how to connect the two lines: ';
            Msg += '<button id="bk">&lt;</button> ';
            Msg += '<button id="choice">CHOOSE OPTION 1</button> ';
            Msg += '<button id="fw">&gt;</button> ';
            UI.SetMessage(Msg, workflowMsg);
            let BkBtn = document.getElementById("bk");
            BkBtn.addEventListener("click", function () {
                if (mChosen > 0) {
                    mChosen--;
                } else {
                    mChosen = 3;
                }
                document.getElementById("choice").innerText = "CHOOSE OPTION " + (mChosen + 1);
                showTmpGeomOnMap(mOptions[mChosen]);
            });
            let FwBtn = document.getElementById("fw");
            FwBtn.addEventListener("click", function () {
                if (mChosen < 3) {
                    mChosen++;
                } else {
                    mChosen = 0;
                }
                document.getElementById("choice").innerText = "CHOOSE OPTION " + (mChosen + 1);
                showTmpGeomOnMap(mOptions[mChosen]);
            });
            let ChooseBtn = document.getElementById("choice");
            ChooseBtn.addEventListener("click", function () {
                doMerge(leg1, leg2, mOptions[mChosen]);
            });
        }
    } catch (e) {
        UI.SetMessage("First search and select 2 Legs...!", errorMsg);
    }
}

function doMerge(leg1, leg2, mergedGeom) {
    const mergeNote = '[Merger of Legs ' + leg1.id + ' & ' + leg2.id + ']\n' + leg1.notes + '\n' + leg2.notes;
    let tmpLeg;
    let tmpID = 888888; // will be changed by Postgres to serial ID
    if (reuseDateTime()) {
        tmpLeg = new Leg(tmpID, mergedGeom, leg1.stopFrom, leg2.stopTo, leg1.startDateTime, leg2.endDateTime, mergeNote, leg1.type, leg1.timesequential);
    } else {
        tmpLeg = new Leg(tmpID, mergedGeom, leg1.stopFrom, leg2.stopTo, '', '', mergeNote, leg1.type, false);
    }
    showTmpGeomOnMap(tmpLeg.geometry.coordinates);
    UI.SetMessage("Merged Legs.", workflowMsg);
    showSaveLegForm(tmpLeg, "workflow", "mergelegs");
}

/*-- Edit selected Leg  -*/
function editLeg(theLegs, ID) {
    for (let aLeg of theLegs.getLegs()) {
        if (aLeg.id === ID) {
            UI.SetMessage("Edit properties and save...", workflowMsg);
            // if dates are NULL in DB, show them as empty string in form;
            if (aLeg.startDateTime === null || aLeg.startDateTime === 'null') aLeg.startDateTime = '';
            if (aLeg.endDateTime === null || aLeg.endDateTime === 'null') aLeg.endDateTime = '';
            UI.workflowPane.innerHTML = HTML.editLegForm(aLeg);
            for (let i = 0; i < APP.legtypes.length; i++) {
                // console.log(legTypes[i].id  + " : " + aLeg.type+ " : " + i);
                if (parseInt(APP.legtypes[i].id) === aLeg.type) document.getElementById("col_type").selectedIndex = i;
            }
            let SaveBtn = document.getElementById("SaveBtn");
            SaveBtn.addEventListener("click", async function () {
                aLeg.startDateTime = document.getElementById("leg_startdatetime").value;
                aLeg.endDateTime = document.getElementById("leg_enddatetime").value;
                // aLeg.name = escapeStr(document.getElementById("leg_name").value);
                aLeg.notes = escapeStr(document.getElementById("leg_notes").value, true);
                aLeg.type = parseInt(document.getElementById("col_type").value);
                if (await DB.patchLeg(aLeg, ID)) {
                    // RELOAD from DB
                    doLegsSearchAndShow(theLegs.getWhereStr(), displayTable = true, displayMap = true, zoomToExtent = false);
                    UI.SetMessage("Edited Leg. Click in map or table to alter selection...", workflowMsg);
                }  else {
                    displayLegsInTable(theLegs, false);
                    UI.SetMessage("Update of Leg FAILED. Click in map or table to alter selection...", workflowMsg);
                }
            });
            let CancelBtn = document.getElementById("CancelBtn");
            CancelBtn.addEventListener("click", function () {
                displayLegsInTable(theLegs, false);
                UI.SetMessage("Cancelled Editing. Click in map or table to alter selection...", workflowMsg);
            });
        }
    }
}

/*-- Delete selected Leg  -*/
async function deleteLeg(theLegs, ID) {
    const theStr = `Are you REALLY sure you want to delete this Leg [id=${ID}]?\nThis action can NOT be undone!`;
    if (confirm(theStr)) {
        if (await DB.deleteLeg(ID)) { //removed from DB
            //reload from DB:
            await theLegs.loadFromDB(theLegs.getWhereStr(), APP.legstops); // re-use existing WHERE statement to reload same legs
            UI.SetMessage("Deleted Leg. Now " + theLegs.getNumLegs() + " Legs found in DB. Click in map or table to alter selection...", workflowMsg);
            theLegs.mapLegs(APP.legstops, false);
            displayLegsInTable(theLegs, false);
        } else {
            UI.SetMessage("Deletion of Leg failed. Click in map or table to alter selection...", workflowMsg);
        }
    }
}

function showTmpGeomOnMap(geom) {
    APP.map.getLayerDataByName("NewLegs").clear();
    let tmpID = 777777;
    let tmpLeg = new Leg(tmpID, geom, undefined, undefined, undefined, undefined, undefined, 0, false);
    tmpLeg.bbox = calcBbox(tmpLeg.geometry.coordinates);
    tmpLeg.showOnMap(APP.map.getLayerDataByName("NewLegs"));
    MAP.zoomToBbox(tmpLeg.bbox);
}