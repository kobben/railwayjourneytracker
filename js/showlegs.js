//Globals:
let myMap, mapView;
let legsData, stopsData;
let theWhereStr;
let stopFromID, stopToID;
let allLegs, allStops;
let legTypes, legTypesMenu;


/*-- Initialization function --*/
async function initShowLegs() {
    UI.InitMessages(true);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (await DB.init('http://localhost:3000', authToken)) {
        UI.SetMessage("Initializing show Legs...", workflowMsg);
        theWhereStr = '';
        legTypes = await loadTypesFromDB(theWhereStr); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
        // ** step 1:
        let startAt = getParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            initMap([startAt[0], startAt[1]], startAt[2], selectClickedLeg); //loc from params
        } else {
            initMap([6.89, 52.22], 11, selectClickedLeg);  //Enschede
        }
        // ***********
        // ** step 2:
        // ***********
        UI.SetMessage("Load existing Legs...", workflowMsg);
        let showIn = document.getElementById('workflow');
        showIn.innerHTML = HTML.searchLegForm();
        // ** wait for form to be submitted => step 3 = searchLegs() **//
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
    let idsClicked = idsFoundAtClick(myMap.getEventPixel(evt.originalEvent));
    if (idsClicked) {
        toggleClickedFeatures(idsClicked);
    }
}


/*-- STEP 3: Load Legs & show them  -*/
async function searchLegs(theWhereStr) {
    allLegs = await loadLegsFromDB(theWhereStr); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
    mapLegs(allLegs, true);
    zoomToLegs(true);
    allStops = await loadStopsFromDB('');
    displayInTable(allLegs, "workflow");
    let NewSearchBtn = document.getElementById("action1Btn");
    NewSearchBtn.value = 'New DB Search';
    NewSearchBtn.style.display = "inline";
    NewSearchBtn.addEventListener("click", function () {
        // new search of legs from DB
        UI.resetActionBtns();
        UI.SetMessage("Load existing Legs...", workflowMsg);
        let showIn = document.getElementById('workflow');
        showIn.innerHTML = HTML.searchLegForm();
        // ** wait for form to be submitted => step 3 = searchLegs() **//
    });
    let ZoomBtn = document.getElementById("action2Btn");
    ZoomBtn.value = 'Zoom to';
    ZoomBtn.style.display = "inline";
    ZoomBtn.addEventListener("click", function () {
        // zoom to legs where .selected = true
        zoomToLegs(false);
    });
    let MergeBtn = document.getElementById("action3Btn");
    MergeBtn.value = 'Merge';
    MergeBtn.style.display = "inline";
    MergeBtn.addEventListener("click", function () {
        mergeSelectedLegs(allLegs);
    });
    let ReturnBtn = document.getElementById("action4Btn");
    ReturnBtn.value = 'Reverse';
    ReturnBtn.style.display = "inline";
    ReturnBtn.addEventListener("click", function () {
        returnOverSelectedLeg();
    });
    let ReuseBtn = document.getElementById("action5Btn");
    ReuseBtn.value = 'Copy';
    ReuseBtn.style.display = "inline";
    ReuseBtn.addEventListener("click", function () {
        reuseSelectedLeg();
    });
    let TruncateBtn = document.getElementById("action6Btn");
    TruncateBtn.value = 'Truncate';
    TruncateBtn.style.display = "inline";
    TruncateBtn.addEventListener("click", function () {
        truncateSelectedLeg(allLegs);
    });
}

/*-- End of STEP 3  -*/

/*--   -*/
function toggleClickedFeatures(ids) {
    for (let id of ids) {
        let IDselect = document.getElementById("select_" + id);
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

function displayInTable(theLegs, htmlElem) {
    let showIn = document.getElementById(htmlElem);
    let html = '<table class="tableFixHead"><thead><tr><th>ID</th><th>Name</th><th>From</th><th>To</th><th>Start</th><th>End</th><th>Type</th><th>Notes</th>';
    html += '<th>Selected</th>';
    html += '<th><input type="button" onclick="selectNoLegs()"  value="None"/></th>';
    html += '<th><input type="button" onclick="selectAllLegs()" value="All"/></th>';
    html += '</tr></thead>';
    for (let aLeg of theLegs) {
        // if (aLeg.selected) {
        html += HTML.showLegRow(aLeg);
        // }
    }
    html += '<tr><th colspan="11"></th></tr></table>';
    showIn.innerHTML = html;
}

function selectAllLegs() {
    for (let aLeg of allLegs) {
        let isRowInTable = document.getElementById("select_" + aLeg.id);
        if (isRowInTable) {
            aLeg.selected = true;
            isRowInTable.checked = true;
        }
    }
    mapLegs(allLegs, true);
}

function selectNoLegs() {
    for (let aLeg of allLegs) {
        let isRowInTable = document.getElementById("select_" + aLeg.id);
        if (isRowInTable) {
            aLeg.selected = false;
            isRowInTable.checked = false;
        }
    }
    mapLegs(allLegs, true);
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
    mapLegs(allLegs, true);
}

function returnOverSelectedLeg() {
    let legsChosen = 0;
    let leg1;
    for (let aLeg of allLegs) {
        if (aLeg.selected) {
            leg1 = aLeg;
            legsChosen++;
        }
    }
    if (legsChosen !== 1) {
        UI.SetMessage("Select (only) 1 Leg...!", errorMsg);
    } else {
        UI.SetMessage("Creating return over selected Leg...", workflowMsg);
        const reverseNote = '[Return trip created from Leg ' + leg1.id + ']\n' + leg1.notes;
        let tmpLeg = undefined;
        let tmpID = 666666; // will be changed by Postgres to serial ID
        if (reuseDateTime()) {
            tmpLeg = new Leg(tmpID, 'ReturnLeg', leg1.geometry.coordinates, leg1.stopTo, leg1.stopFrom, leg1.startDateTime, leg1.endDateTime, reverseNote, leg1.type);
        } else {
            tmpLeg = new Leg(tmpID, 'ReturnLeg', leg1.geometry.coordinates, leg1.stopTo, leg1.stopFrom, '', '', reverseNote, leg1.type);
        }
        selectNoLegs();
        newLegsData.clear();
        tmpLeg.bbox = calcBbox(tmpLeg.geometry.coordinates);
        zoomMapToBbox(tmpLeg.bbox);
        showFeatureOnMap(tmpLeg.toOlFeature(), newLegsData);
        UI.SetMessage("Creating return Leg.", workflowMsg);
        showSaveLegForm(tmpLeg, "workflow", "returnleg");
    }
}

function reuseSelectedLeg() {
    let legsChosen = 0;
    let leg1;
    for (let aLeg of allLegs) {
        if (aLeg.selected) {
            leg1 = aLeg;
            legsChosen++;
        }
    }
    if (legsChosen !== 1) {
        UI.SetMessage("Select (only) 1 Leg...!", errorMsg);
    } else {
        UI.SetMessage("Copied selected Leg...", workflowMsg);
        const copyNote = '[Copy of Leg ' + leg1.id + ']\n' + leg1.notes;
        let tmpLeg = undefined;
        let tmpID = 5555555; // will be changed by Postgres to serial ID
        if (reuseDateTime()) {
            tmpLeg = new Leg(tmpID, 'CopiedLeg', leg1.geometry.coordinates, leg1.stopFrom, leg1.stopTo, leg1.startDateTime, leg1.endDateTime, copyNote, leg1.type);
        } else {
            tmpLeg = new Leg(tmpID, 'CopiedLeg', leg1.geometry.coordinates, leg1.stopFrom, leg1.stopTo, '', '', copyNote, leg1.type);
        }
        selectNoLegs();
        newLegsData.clear();
        tmpLeg.bbox = calcBbox(tmpLeg.geometry.coordinates);
        zoomMapToBbox(tmpLeg.bbox);
        showFeatureOnMap(tmpLeg.toOlFeature(), newLegsData);
        showSaveLegForm(tmpLeg, "workflow", "copyleg");
    }
}

function truncateSelectedLeg() {
    let legsChosen = 0;
    let leg1;
    stopFromID = undefined; stopToID = undefined;
    for (let aLeg of allLegs) {
        if (aLeg.selected) {
            leg1 = aLeg;
            legsChosen++;
        }
    }
    if (legsChosen !== 1) {
        UI.SetMessage("Select (only) 1 Leg...!", errorMsg);
    } else {
        zoomToLegs(false);
        UI.SetMessage("Select existing stops to truncate Leg at...", workflowMsg);
        mapStops(allStops, stopsData);
        let showIn = document.getElementById('workflow');
        makeStopsMenu(showIn, 0);
        UI.resetActionBtns();
        // create split button:
        let TruncateBtn = document.getElementById("action1Btn");
        TruncateBtn.value = 'TRUNCATE LEG';
        TruncateBtn.style.display = "inline";
        TruncateBtn.addEventListener("click", function () {
            doTruncateLeg(leg1, stopFromID, stopToID);
        });
        // create refreshStopsBtn:
        let refreshStopsBtn = document.getElementById("action2Btn");
        refreshStopsBtn.value = 'REFRESH Stops menus';
        refreshStopsBtn.style.display = "inline";
        refreshStopsBtn.addEventListener("click", async function () {
            allStops = await loadStopsFromDB(''); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
            mapStops(allStops, stopsData);
            makeStopsMenu(showIn, 0);
        });
    }
//Waiting for choices and TRUNCATE btn click to start next step
}

function doTruncateLeg(originalLeg, stopFromID, stopToID) {
    UI.SetMessage("Truncating Leg...", workflowMsg);
    const copyNote = '[Truncated version of Leg ' + originalLeg.id + ']\n' + originalLeg.notes;
    let tmpLeg = undefined;
    let tmpID = 121212; // will be changed by Postgres to serial ID
    if (reuseDateTime()) {
        tmpLeg = new Leg(tmpID, 'TruncatedLeg', originalLeg.geometry.coordinates, undefined, undefined,  originalLeg.startDateTime, originalLeg.endDateTime,  copyNote, originalLeg.type);
    } else {
        tmpLeg = new Leg(tmpID, 'TruncatedLeg', originalLeg.geometry.coordinates, undefined, undefined,  '', '', copyNote, originalLeg.type);
    }
    //first get stop objects from DB
    let stopFromAdded = false;
    let stopToAdded = false;
    //if nor found, copy stops from all Stops
    for (let stop of allStops) {
        if (stop.id === stopFromID) {
            tmpLeg.stopFrom = stop;
            stopFromAdded = true;
        }
        if (stop.id === stopToID && stopToID !== stopFromID) {
            tmpLeg.stopTo = stop;
            stopToAdded = true;
        }
    }
    if (!stopFromAdded || !stopToAdded) {
        UI.SetMessage("From and/or To stops could not be created correctly.\nCheck if both are selected and are different...", errorMsg);
    } else {
        tmpLeg.geometry.coordinates = extractLegFromLine(tmpLeg.geometry.coordinates, tmpLeg.stopFrom.geometry.coordinates, tmpLeg.stopTo.geometry.coordinates);
        // first remove stops & lines of Relation from map:
        stopsData.clear();
        newLegsData.clear();
        // myMap.getLayers().getArray().find(layer => layer.get('name') === 'Legs').setVisible(false); // hide layer first
        tmpLeg.bbox = calcBbox(tmpLeg.geometry.coordinates);
        // console.log(tmpLeg);
        showFeatureOnMap(tmpLeg.toOlFeature(), newLegsData);
        showFeatureOnMap(tmpLeg.stopFrom.toOlFeature(), newStopsData);
        showFeatureOnMap(tmpLeg.stopTo.toOlFeature(), newStopsData);
        zoomMapToBbox(tmpLeg.bbox);
        UI.SetMessage('Constructed Leg object.', workflowMsg);
        UI.SetMessage("Truncated Leg. Add properties & Save...", workflowMsg);
        let SaveBtn = document.getElementById("action3Btn");
        SaveBtn.value = 'ADD PROPERTIES & SAVE';
        SaveBtn.style.display = "inline";
        SaveBtn.addEventListener("click", function () {
            // **** Show Save Form:
            showSaveLegForm(tmpLeg, "workflow", "truncateleg");
        });
    }
}

function mergeSelectedLegs(allLegs) {
    let leg1 = false;
    let leg2 = false;
    for (let aLeg of allLegs) {
        if (aLeg.selected) {
            if (!leg1) {
                leg1 = aLeg;
            } else {
                if (!leg2) {
                    leg2 = aLeg;
                } else {
                    UI.SetMessage("Cannot merge more than 2 Legs at a time...!", errorMsg);
                }
            }
        }
    }
    if (leg1 === false || leg2 === false) {
        UI.SetMessage("Need 2 Legs for a merge...!", errorMsg);
    } else {
        UI.SetMessage("Merging legs...", workflowMsg);
        // first figure out how the two are connected by measuring shortest distance
        const d12 = turf.distance(turf.point(leg1.stopTo.geojson.coordinates), turf.point(leg2.stopFrom.geojson.coordinates), {units: 'degrees'});
        const d21 = turf.distance(turf.point(leg2.stopTo.geojson.coordinates), turf.point(leg1.stopFrom.geojson.coordinates), {units: 'degrees'});
        if (d12 > d21) { // if not then do nothing, order leg1 -> leg2 is correct
            // otherwise change order leg2 -> leg1
            let tmpLeg = leg2;
            leg2 = leg1;
            leg1 = tmpLeg;
        }
        // then show possible different merger types to user and let user choose.
        // TODO: is this robust? I doubt it...
        let mOptions = [];
        mOptions[0] = leg1.geometry.coordinates.concat(leg2.geometry.coordinates);
        mOptions[1] = reverseLineGeom(leg1.geometry.coordinates).concat(leg2.geometry.coordinates);
        mOptions[2] = leg1.geometry.coordinates.concat(reverseLineGeom(leg2.geometry.coordinates));
        mOptions[3] = reverseLineGeom(leg1.geometry.coordinates).concat(reverseLineGeom(leg2.geometry.coordinates));
        let mChosen = 0;
        showTmpLegOnMap(mOptions[mChosen]);
        let Msg = 'How to connect the two lines: ';
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
            showTmpLegOnMap(mOptions[mChosen]);
        });
        let FwBtn = document.getElementById("fw");
        FwBtn.addEventListener("click", function () {
            if (mChosen < 3) {
                mChosen++;
            } else {
                mChosen = 0;
            }
            document.getElementById("choice").innerText = "CHOOSE OPTION " + (mChosen + 1);
            showTmpLegOnMap(mOptions[mChosen]);
        });
        let ChooseBtn = document.getElementById("choice");
        ChooseBtn.addEventListener("click", function () {
            doMerge(leg1, leg2, mOptions[mChosen]);
        });
    }
}

function doMerge(leg1, leg2, mergedGeom) {
    const mergeNote = '[Merger of Legs ' + leg1.id + ' & ' + leg2.id + ']\n' + leg1.notes + '\n' + leg2.notes;
    let tmpLeg = undefined;
    let tmpID = 888888; // will be changed by Postgres to serial ID
    if (reuseDateTime()) {
        tmpLeg = new Leg(tmpID, 'MergedLeg', mergedGeom, leg1.stopFrom, leg2.stopTo, leg1.startDateTime, leg2.endDateTime, mergeNote, leg1.type);
    } else {
        tmpLeg = new Leg(tmpID, 'MergedLeg', mergedGeom, leg1.stopFrom, leg2.stopTo, '', '', mergeNote, leg1.type);
    }
    selectNoLegs();
    newLegsData.clear();
    tmpLeg.bbox = calcBbox(tmpLeg.geometry.coordinates);
    zoomMapToBbox(tmpLeg.bbox);
    showFeatureOnMap(tmpLeg.toOlFeature(), newLegsData);
    UI.SetMessage("Merged Legs.", workflowMsg);
    showSaveLegForm(tmpLeg, "workflow", "mergelegs");
}

/*-- Edit selected Leg  -*/
function editLeg(ID, htmlElem) {
    for (let aLeg of allLegs) {
        if (aLeg.id === ID) {
            UI.SetMessage("Edit properties and save...", workflowMsg);
            let showIn = document.getElementById(htmlElem);
            // if dates are NULL in DB, show them as empty string in form;
            if (aLeg.startDateTime === null || aLeg.startDateTime === 'null') aLeg.startDateTime = '';
            if (aLeg.endDateTime === null || aLeg.endDateTime === 'null') aLeg.endDateTime = '';
            const html = HTML.editLegForm(aLeg);
            showIn.innerHTML = html;
            document.getElementById("leg_type_select").selectedIndex = aLeg.type;
            let SaveBtn = document.getElementById("SaveBtn");
            SaveBtn.addEventListener("click", function () {
                aLeg.startDateTime = document.getElementById("leg_startdatetime").value;
                aLeg.endDateTime = document.getElementById("leg_enddatetime").value;
                aLeg.name = escapeStr(document.getElementById("leg_name").value);
                aLeg.notes = escapeStr(document.getElementById("leg_notes").value);
                aLeg.type = document.getElementById("leg_type_select").value;
                if (DB.patchLeg(aLeg, ID)) {
                    selectNoLegs();
                    toggleSelect(ID);
                    zoomToLegs(false);
                    displayInTable(allLegs, "workflow");
                    UI.SetMessage("Edited Leg. Click in map or table to alter selection...", workflowMsg);
                }
            });
            let CancelBtn = document.getElementById("CancelBtn");
            CancelBtn.addEventListener("click", function () {
                displayInTable(allLegs, "workflow");
                UI.SetMessage("Cancelled Editing. Click in map or table to alter selection...", workflowMsg);
            });
        }
    }
}

/*-- Delete selected Leg  -*/
async function delLeg(ID) {
    const theStr = `Are you REALLY sure you want to delete this Leg [id=${ID}]?\nThis action can NOT be undone!`;
    if (confirm(theStr)) {
        if (await DB.deleteLeg(ID)) {
            for (let i = 0; i < allLegs.length; i++) {
                allLegs[i].selected = true;
                if (allLegs[i].id === ID) {
                    allLegs.splice(i, 1);
                }
            }
            UI.SetMessage("Deleted Leg. Now " + allLegs.length
                + " Journey Legs available. Click in map or table to alter selection...", workflowMsg);
            allLegs = await loadLegsFromDB(theWhereStr);
            mapLegs(allLegs, true);
            displayInTable(allLegs, "workflow");
            zoomToLegs(true);
        } else {
            UI.SetMessage("Error deleting Leg", errorMsg);
        }
    }
}

