// ***************************************************************//
// SHOWSTOPS
// this APP lets you search Stops in a DB, edit/update, and delete them.
//
// v1.0  May 2023, see README.md for details
// ***************************************************************//
//
// we create a global APP obj here:
let APP = {
    name: "showStops",
    url: "showstops.html",
    // needed for postREST DB access:
    authToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw",
    map: undefined,
    stops : undefined,
    restart: function () {
        const curZoom = APP.map.mapView.getZoom();
        const curCenter = ol.proj.transform(APP.map.mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
        window.location = "./" + APP.url + "?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
    }
};

/*-- Initialization function --*/
async function initShowStops() {
    UI.InitMessages(true);
    UI.SetMessage("Initializing ShowStops...", workflowMsg);
    if (DB.init('http://localhost:3000', APP.authToken)) {
        // ** step 1:
        let startAt = getURIParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            APP.map = MAP.init("ShowStopsMap", [startAt[0], startAt[1]], startAt[2], selectClickedStop); //start loc from URIparams
        } else {
            APP.map = MAP.init("ShowStopsMap",[6.89, 52.22], 11, selectClickedStop);  //startloc = Enschede
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
        // ** step 2:
        showSearchForm();
    } else {
        UI.SetMessage("Could not initialise DB connection.", errorMsg);
    }
}

/*-- end of init -*/

/*-- **************************** -*/
/*-- Workflow/Interactivity Steps:-*/
/*-- **************************** -*/

// callback function for clicks in map: will trigger STEP 4: toggling selection of clicked stops
function selectClickedStop(evt) {
    let idsClicked = MAP.idsFoundAtClick(evt);
    if (idsClicked) {
        toggleClickedFeatures(idsClicked);
    }
}

/*-- STEP 2: Load Search Form and wait form it to be submitted  -*/
function showSearchForm() {
    let theWhereStr = '';
    UI.SetMessage("Search Stops...", workflowMsg);
    
    UI.workflowPane.innerHTML = HTML.searchStopForm();
    let SearchBtn = document.getElementById("SearchBtn");
    SearchBtn.addEventListener("click", async function () {
        theWhereStr = await updateWhereStr('stops',['id','name']);
        APP.stops = await searchAndShowStops(theWhereStr);
    });
    // ** wait for form to be submitted => step 3 = searchAndShowStops() **//
}

/*-- STEP 3: Load Stops & show them  -*/
async function searchAndShowStops(theWhereStr) {
    let zoomToExtent = document.getElementById("zoomtoextent").checked;
    let foundStops = new StopsCollection(APP.map.getLayerDataByName("Stops"));
    await foundStops.loadFromDB(theWhereStr);
    UI.SetMessage(foundStops.getNumStops() + " Stops found in DB. Click in map or table to alter selection...", workflowMsg);
    foundStops.mapStops(zoomToExtent);
    displayStopsInTable(foundStops, false);
    let NewSearchBtn = document.getElementById("action1Btn");
    NewSearchBtn.value = 'New DB Search';
    NewSearchBtn.style.display = "inline";
    NewSearchBtn.addEventListener("click", function () {
        // show form again to do new search of stops from DB
        UI.resetActionBtns();
        showSearchForm();
    });
    return foundStops;
}
/*-- End of STEP 3  -*/


/*--   -*/
function toggleClickedFeatures(ids) {
    for (let id of ids) {
        let IDselect = document.getElementById("select_"+id);
        if (IDselect) { //exists in list
            APP.stops.selectStops(id);
        }
    }
}

// uses HTML templating functions to create table:
function displayStopsInTable(theStops, doFilter=false) {
    
    UI.workflowPane.innerHTML = HTML.showStopsTable(theStops, true, doFilter);
    let selectAllBtn = document.getElementById("selectAll");
    selectAllBtn.addEventListener("click", function () {
        theStops.selectStops(1); // 1 == all on
    });
    let selectNoneBtn = document.getElementById("selectNone");
    selectNoneBtn.addEventListener("click", function () {
        theStops.selectStops(0); // 0 = all off
    });
    let zoomtoBtn = document.getElementById("zoomTo");
    zoomtoBtn.addEventListener("click", function () {
        MAP.zoomToBbox(theStops.calculateBbox(true)) ;
    });
    let filterBtn = document.getElementById("filter");
    filterBtn.addEventListener("click", function () {
        if (doFilter) {
            displayStopsInTable(theStops, false);
        } else {
            displayStopsInTable(theStops, true);
        }
    });
    for (let aStop of theStops.getStops()) {
        let selBtn = document.getElementById("select_" + aStop.id);
        if (selBtn) { // only for those not filtered out!
            selBtn.addEventListener("click", function () {
                theStops.selectStops(aStop.id); // id = toggle just this one
            });
        }
        let delBtn = document.getElementById("del_" + aStop.id);
        if (delBtn) { // only for those not filtered out!
            delBtn.addEventListener("click", function () {
                deleteStop(theStops, aStop.id);
            });
        }
        let editBtn = document.getElementById("edit_" + aStop.id);
        if (editBtn) { // only for those not filtered out!
            editBtn.addEventListener("click", function () {
                editStop(theStops, aStop.id, htmlElem);
            });
        }
    }
}

/*-- Edit selected Stop  -*/
function editStop(theStops, ID) {
    for (let aStop of theStops.getStops()) {
        if (aStop.id === ID) {
            UI.SetMessage("Edit properties and save...", workflowMsg);
            
            UI.workflowPane.innerHTML = HTML.editStopForm(aStop);
            let SaveBtn = document.getElementById("SaveBtn");
            SaveBtn.addEventListener("click", function () {
                aStop.name = escapeStr(document.getElementById("stop_name").value, true);
                if (DB.patchStop(aStop, ID)) {
                    displayStopsInTable(theStops, "workflow");
                    UI.SetMessage("Edited Stop. Click in map or table to alter selection...", workflowMsg);
                }  else {
                    displayStopsInTable(theStops, "workflow");
                    UI.SetMessage("Update of Stop FAILED. Click in map or table to alter selection...", workflowMsg);
                }
            });
            let CancelBtn = document.getElementById("CancelBtn");
            CancelBtn.addEventListener("click", function () {
                displayStopsInTable(theStops, "workflow");
                UI.SetMessage("Cancelled Editing. Click in map or table to alter selection...", workflowMsg);
            });
        }
    }
}
/*-- Delete selected Stop  -*/
async function deleteStop(theStops, ID) {
    const theStr = `Are you REALLY sure you want to delete this Stop [id=${ID}]?\nThis action can NOT be undone!`;
    if (confirm(theStr)) {
        if (await DB.deleteStop(ID)) { //removed from DB
            //reload from DB:
            await theStops.loadFromDB(theStops.getWhereStr()); // re-use existing WHERE statement to reload same stops
            theStops.mapStops(false);
            displayStopsInTable(theStops, "workflow", false);
            UI.SetMessage("Deleted Stop. Now " + theStops.getNumStops()
                + " Stops available. Click in map or table to alter selection...", workflowMsg);
        } else {
            UI.SetMessage("Deletion of Stop failed. Click in map or table to alter selection...", workflowMsg);
        }
    }
}

