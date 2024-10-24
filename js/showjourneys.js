// ***************************************************************//
// SHOWJOURNEYS
// this APP lets you search Journeys in a DB, edit/update, and delete them.
//
// v1.0  May 2023, see README.md for details
// ***************************************************************//
//
// we create a global APP obj here:
let APP = {
    name: "showJourneys",
    url: "showJourneys.html",
    // needed for postREST DB access:
    authToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw",
    map: undefined,
    allstops: undefined, //always need a collection of all existing stops for various tasks
    // legstops: undefined, //these are the stops that are end- or startpoint of the selected legs
    // alllegs: undefined,
    journeys: undefined,
    legtypes: undefined,
    journeytypes: undefined,
    restart: function () {
        const curZoom = this.map.mapView.getZoom();
        const curCenter = ol.proj.transform(this.map.mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
        location.replace(this.url + "?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom);
    }
};

/*-- Initialization function --*/
async function initShowJourneys() {
    UI.InitMessages(true);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (await DB.init('http://localhost:3000', authToken)) {
        UI.SetMessage("Initializing show Journeys...", workflowMsg);
// ***********
// ** step 1:
// ***********
        let startWithJourneyID = getURIParameterByName("id");
        let startAt = getURIParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            APP.map = MAP.init("ShowJourneysMap", [startAt[0], startAt[1]], startAt[2], selectClickedJourney); //loc from params
        } else {
            APP.map = MAP.init("ShowJourneysMap", [6.89, 52.22], 10, selectClickedJourney);  //Enschede
        }
        APP.map.StopStyle = MAP.stopStyleBlue;
        APP.map.StopSelectedStyle = MAP.stopStyleRed;
        APP.map.LegStyle = MAP.lineStyleBlue;
        APP.map.LegSelectedStyle = MAP.lineStyleRed;
        APP.map.JourneyStyle = MAP.lineStyleBlue;
        APP.map.JourneySelectedStyle = MAP.lineStyleRed;
        APP.map.displayLayer("openRailwayMap", false);
        APP.map.displayLayer("Legs", false);
        APP.legtypes = await DB.loadTypesFromDB('legtypes');
        APP.journeytypes = await DB.loadTypesFromDB('journeytypes');
        APP.journeys = new JourneysCollection(APP.map.getLayerDataByName("Journeys"));
        APP.allstops = new StopsCollection(null); // non-mappable!
        await APP.allstops.loadFromDB(''); //empty WhereStr makes that ALL stops are loaded.
// ***********
// ** step 2:
// ***********
        if (startWithJourneyID) {
            let theWhereStr = 'id=eq.' + startWithJourneyID;
            doJourneySearchAndShow(theWhereStr, true, true, true, null);
        }
        showSearchJourneysForm(false, true, true);
        UI.SetMessage("Search for Journeys in DB...", workflowMsg);
        // ** wait for form to be submitted
        //  returns with APP.legs + APP.legstops set
        //   ==> step 3:  create various menus
        // ***********
        let NewSearchBtn = document.getElementById("action1Btn");
        NewSearchBtn.value = 'New DB Search';
        NewSearchBtn.style.display = "inline";
        NewSearchBtn.addEventListener("click",  function () {
            if (APP.journeys === undefined || APP.journeys === null) {
                // no search yet, so ignore this btn
            } else { //new search of leg
                APP.journeys.clearMap();
                APP.journeys = undefined;
                APP.journeys = new JourneysCollection(APP.map.getLayerDataByName("Journeys"));
                APP.map.getLayerDataByName("Journeys").clear();
                APP.map.getLayerDataByName("Stops").clear();
                showSearchJourneysForm(false,true, true);
                UI.SetMessage("Search for Journeys in DB...", workflowMsg);
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

// callback function for clicks in map: will be toggling selection of  Journeys - based on Legs clicked!
function selectClickedJourney(evt) {
    let idsClicked = MAP.idsFoundAtClick(evt);
    if (idsClicked) {
        for (let id of idsClicked) { // these are ID's of Legs that are part of a Journey
            for (let aJourney of APP.journeys.getJourneys()) {
                if (aJourney.getLegIDs().includes(id)) {
                    APP.journeys.selectJourneys(aJourney.id);
                }
            }
        }
    }
}


// ***********
// Load Search Form and wait for it to be submitted
// after submission in ==> doLegsSearchAndShow
// ***********
function showSearchJourneysForm(withSkipBtn = false, displayTable = true, displayMap = true, doNextStep = null) {
    UI.workflowPane.innerHTML = HTML.searchJourneyForm(HTML.createTypesMenu(APP.journeytypes, true), withSkipBtn);
    if (withSkipBtn) {
        let SkipBtn = document.getElementById("SkipBtn");
        SkipBtn.addEventListener("click",  function () {
            // if a next step was defined, just skip entirely
            if (doNextStep !== null) {
                doNextStep.call();
            } else {
                // else, to make sure we return NO legs, but we do have all data structures in place, search for *nothing* :
                let theWhereStr = 'id=eq.-99999';
                doJourneySearchAndShow(theWhereStr, displayTable, displayMap, false, doNextStep, false);
            }
        });
    }
    let SearchBtn = document.getElementById("SearchBtn");
    SearchBtn.addEventListener("click", async function () {
        let theWhereStr = await updateWhereStr('journeys', ['id','notes', 'type','stopfrom', 'stopto', 'startdatetime', 'enddatetime']);
        let zoomToExtent = document.getElementById("zoomtoextent").checked;
        let searchInBbox = document.getElementById("searchinbbox").checked;
        if (searchInBbox) { //override Zoom toExtent setting:
            zoomToExtent = false;
            document.getElementById("zoomtoextent").checked = false;
        }
        doJourneySearchAndShow(theWhereStr, displayTable, displayMap, zoomToExtent, doNextStep,searchInBbox);
    });
    // ** wait for form to be submitted, then next step  **//
}

// do actual DB search and show results
// used in showSearchLegsForm() above and to redo existing searches elsewhere
// returns APP.legs and APP.legstops
async function doJourneySearchAndShow(theWhereStr, displayTable = true, displayMap = true,
                                   zoomToExtent = true, doNextStep = null, searchInBbox = false) {
    document.body.style.cursor = "progress";
    await APP.journeys.loadFromDB(theWhereStr, searchInBbox);
    UI.SetMessage(APP.journeys.getNumJourneys() + " Journeys found in DB...", workflowMsg);
    if (displayMap) APP.journeys.mapJourneys(zoomToExtent);

    if (displayTable) {
        displayJourneysInTable(APP.journeys, false);
    } else {
        UI.workflowPane.innerHTML = '';
    }
    document.body.style.cursor = "auto";
    if (doNextStep !== null) doNextStep.call();
}

function displayJourneysInTable(theJourneys, filter = false) {
    UI.workflowPane.innerHTML = HTML.showJourneysTable(theJourneys, true, filter);
    let selectAllBtn = document.getElementById("selectAll");
    selectAllBtn.addEventListener("click", function () {
        theJourneys.selectJourneys(1); // 1 == all on
    });
    let selectNoneBtn = document.getElementById("selectNone");
    selectNoneBtn.addEventListener("click", function () {
        theJourneys.selectJourneys(0); // 0 = all off
    });
    let zoomtoBtn = document.getElementById("zoomTo");
    zoomtoBtn.addEventListener("click", function () {
        MAP.zoomToBbox(theJourneys.calculateBbox(true));
    });
    let filterBtn = document.getElementById("filter");
    filterBtn.addEventListener("click", function () {
        if (filter) {
            displayJourneysInTable(theJourneys, false);
        } else {
            displayJourneysInTable(theJourneys, true);
        }
    });
    for (let aJourney of theJourneys.getJourneys()) {

        let selBtn = document.getElementById("select_" + aJourney.id);
        if (selBtn) { // only for those not filtered out!
            selBtn.addEventListener("click", function () {
                theJourneys.selectJourneys(aJourney.id); // id = toggle just this one
            });
        }
        let delBtn = document.getElementById("del_" + aJourney.id);
        if (delBtn) { // only for those not filtered out!
            delBtn.addEventListener("click", function () {
                delJourney(aJourney.id);
            });
        }
        let editBtn = document.getElementById("edit_" + aJourney.id);
        if (editBtn) { // only for those not filtered out!
            editBtn.addEventListener("click", function () {
                editJourney(APP.journeys, aJourney.id);
            });
        }
    }
}

//needed because we otherwise have too many nested quotes...
function filterJourneys(doFilter) {
    displayJourneysInTable(APP.journeys, "workflow", doFilter);
}

/*-- Edit selected Journey  -*/
function editJourney(theJourneys, ID) {
    for (let theJourney of APP.journeys.getJourneys()) {
        if (theJourney.id === ID) {
            UI.SetMessage("Edit properties and save...", workflowMsg);
            // if dates are NULL in DB, show them as empty string in form;
            if (theJourney.startDateTime === null || theJourney.startDateTime === 'null') theJourney.startDateTime = '';
            if (theJourney.endDateTime === null || theJourney.endDateTime === 'null') theJourney.endDateTime = '';
            UI.workflowPane.innerHTML = HTML.editJourneyForm(theJourney, true);
            for (let i=0; i < APP.journeytypes.length; i++) {
                if (parseInt(APP.journeytypes[i].id) === theJourney.type) document.getElementById("col_type").selectedIndex = i;
            }
            let SaveBtn = document.getElementById("SaveBtn");
            SaveBtn.addEventListener("click", async function () {
                theJourney.notes = escapeStr(document.getElementById("journey_notes").value, true);
                theJourney.type = parseInt(document.getElementById("col_type").value);
                if (await DB.patchJourney(theJourney, ID) ) {
                    // RELOAD from DB
                    doJourneySearchAndShow(theJourneys.getWhereStr(), displayTable = true, displayMap = true, zoomToExtent = false);
                    UI.SetMessage("Edited Journey. Click in map or table to alter selection...", workflowMsg);
                } else {
                    displayJourneysInTable(APP.journeys, false);
                    UI.SetMessage("Update of Journey FAILED. Click in map or table to alter selection...", workflowMsg);
                }
            });
            let CancelBtn = document.getElementById("CancelBtn");
            CancelBtn.addEventListener("click", function () {
                displayJourneysInTable(APP.journeys, false);
                UI.SetMessage("Cancelled Editing. Click in map or table to alter selection...", workflowMsg);
            });
        }
    }
}

/*-- Delete selected Journey  -*/
async function delJourney(ID) {
    let theStr = `Are you sure you want to delete this Journey [id=${ID}]?`;
    if (confirm(theStr)) {
        theStr = `Are you REALLY sure you want to delete this Journey [id=${ID}]?\nThis action CAN NOT BE UNDONE!`;
        if (confirm(theStr)) {
            if (await DB.deleteJourney(ID)) {
                //reload from DB:
                await APP.journeys.loadFromDB(APP.journeys.getWhereStr()); // re-use existing WHERE statement to reload same legs
                UI.SetMessage("Deleted Journey. Now " + APP.journeys.getNumJourneys() + " Journeys found in DB. Click in map or table to alter selection...", workflowMsg);
                APP.journeys.mapJourneys(false, true);
                displayJourneysInTable(APP.journeys, false);
            } else {
                UI.SetMessage("Deletion of Journey failed. Click in map or table to alter selection...", workflowMsg);
            }
        }
    }
}

function highlightLegOfJourney(theJourneyID, theLegID, highlight) {
    let theLeg = APP.journeys.getJourneyById(theJourneyID).getLegsCollection().getLegById(theLegID);
    if (highlight) {
        theLeg.selected = !theLeg.selected;
        let X = document.getElementById("btn_" + theLegID).getBoundingClientRect().right - 10;
        let Y = document.getElementById("btn_" + theLegID).getBoundingClientRect().top - 170;
        UI.SetMessage(HTML.journeyLegInfoPopup(theLeg), dataMsg, [X, Y]);
    } else {
        theLeg.selected = !theLeg.selected;
        UI.SetMessage(' ', hideMsg, null);
    }
    theLeg.selectOnMap(theLeg.selected, APP.map.getLayerDataByName("Journeys"));
}

