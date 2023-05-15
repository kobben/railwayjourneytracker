// ***************************************************************//
// COLLECTJOURNEYS
// this APP lets you create Journeys by collecting Legs into a Journey
//
// v1.0  May 2023, see README.md for details
// ***************************************************************//
//
// we create a global APP obj here:
let APP = {
    name: "collectJourneys",
    url: "collectJourneys.html",
    // needed for postREST DB access:
    authToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw",
    map: undefined,
    allstops: undefined, //always need a collection of all existing stops for various tasks
    legstops: undefined, //these are the stops that are end- or startpoint of the selected legs
    legs: undefined,
    legtypes: undefined,
    journeys: undefined,
    journeytypes: undefined,
    restart: function () {
        const curZoom = APP.map.mapView.getZoom();
        const curCenter = ol.proj.transform(APP.map.mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
        window.location = "./" + APP.url + "?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
    }
};

/*-- Initialization function --*/
async function initCollectJourneys() {
    UI.InitMessages(true);
    UI.SetMessage("Initializing CollectJourneys APP...", workflowMsg);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (await DB.init('http://localhost:3000', authToken)) {
        APP.legtypes = await DB.loadTypesFromDB('legtypes');
        APP.journeytypes = await DB.loadTypesFromDB('journeytypes');
        // ***********
        // ** step 1:
        // ***********
        let startAt = getURIParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            APP.map = MAP.init("CollectJourneysMap", [startAt[0], startAt[1]], startAt[2], selectClickedLeg); //loc from params
        } else {
            APP.map = MAP.init("CollectJourneysMap", [6.89, 52.22], 11, selectClickedLeg);  //Enschede
        }
        APP.map.StopStyle = MAP.stopStyleBlue;
        APP.map.StopSelectedStyle = MAP.stopStyleRed;
        APP.map.LegStyle = MAP.lineStyleBlue;
        APP.map.LegSelectedStyle = MAP.lineStyleRed;
        APP.map.JourneyStyle = MAP.lineStyleGrey;
        APP.map.JourneySelectedStyle = MAP.lineStyleRed;
        APP.map.displayLayer("openRailwayMap", false);
        APP.map.displayLayer("Journeys", true);
        // create datastructures needed later:
        APP.legs = new LegsCollection(APP.map.getLayerDataByName("Legs"));
        APP.journeys = new JourneysCollection(APP.map.getLayerDataByName("Journeys"));
        APP.legstops = new StopsCollection(APP.map.getLayerDataByName("Stops"));
        APP.allstops = new StopsCollection(null); // non-mappable!
        await APP.allstops.loadFromDB(''); //empty WhereStr makes that ALL stops are loaded.
        /*-- ********** -*/
        // ** step 2:
        // ***********
        showSearchLegsForm(false, true, true, null, false); // in Utils.js
        UI.SetMessage("Search for Legs in DB...", workflowMsg);
        // ** wait for form to be submitted
        //  returns with APP.legs + APP.legstops set
        //   ==> step 3:  create various menus
        // ***********
        let NewSearchBtn = document.getElementById("action1Btn");
        NewSearchBtn.value = 'New DB Search';
        NewSearchBtn.style.display = "inline";
        NewSearchBtn.addEventListener("click", function () {
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
                showSearchLegsForm(false, true, true, null, false); // in Utils.js
                UI.SetMessage("Search for Legs in DB...", workflowMsg);
            }
        });
        let CollectBtn = document.getElementById("action2Btn");
        CollectBtn.value = 'Collect selected Legs into Journey';
        CollectBtn.style.display = "inline";
        CollectBtn.addEventListener("click", function () {
            collectIntoJourney(APP.legs.getLegs().filter(aLeg => aLeg.selected));
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

async function collectIntoJourney(selectedLegs) {
    if (selectedLegs === undefined || selectedLegs.length < 1) {
        UI.SetMessage("Need at least 1 Leg...!", errorMsg);
    } else {
        UI.SetMessage("Collecting legs...", workflowMsg);
        // check if any leg is sequential time type:
        if (selectedLegs.some(function (aLeg) { return aLeg.timesequential })) {
            UI.SetMessage("One or more Legs use Sequential Time. Cannot create Journeys from such legs...!", errorMsg);
        } else {
            // sort Legs  ascending by startDateTime
            selectedLegs.sort(function (a, b) {
                const dt1 = new Date(a.startDateTime)
                const dt2 = new Date(b.startDateTime)
                return dt1 - dt2;
            });
            for (let aLeg of selectedLegs) { aLeg.selected = false;}

            UI.SetMessage("Collected Legs. Save Journey or Redo...", workflowMsg);
            let journeyNotes = '[collected notes from legs:]\n';
            for (let aLeg of selectedLegs) {
                journeyNotes += aLeg.notes + '\n';
            }
            let legIDs = selectedLegs.map(aLeg => aLeg.id);
            let stopFrom = selectedLegs[0].stopFrom;
            let stopTo = selectedLegs[selectedLegs.length-1].stopTo;
            let startDateTime = selectedLegs[0].startDateTime;
            let endDateTime = selectedLegs[selectedLegs.length-1].endDateTime;

            let tmpJourney = new Journey(123456789, journeyNotes, 0, legIDs, stopFrom, stopTo, startDateTime, endDateTime);
            await tmpJourney.loadJourneyLegsFromDB(); // needed to load Legs into it

            MAP.zoomToBbox(tmpJourney.calculateBbox());
            tmpJourney.showOnMap(APP.map.getLayerDataByName("Journeys"));
            APP.journeys.addJourney(tmpJourney);
            showSaveJourneyForm(tmpJourney);
        }
    }
}


function showSaveJourneyForm(theJourney) {
    UI.SetMessage("Edit properties and save...", workflowMsg);
    UI.hideActionBtns();
    // if dates are NULL in DB, show them as empty string in form;
    if (theJourney.startDateTime === null || theJourney.startDateTime === 'null') theJourney.startDateTime = '';
    if (theJourney.endDateTime === null || theJourney.endDateTime === 'null') theJourney.endDateTime = '';
    UI.workflowPane.innerHTML = HTML.editJourneyForm(theJourney);
    for (let i=0; i < APP.journeytypes.length; i++) {
        if (parseInt(APP.journeytypes[i].id) === theJourney.type) document.getElementById("col_type").selectedIndex = i;
    }
    let SaveBtn = document.getElementById("SaveBtn");
    SaveBtn.addEventListener("click", async function () {
        theJourney.notes = escapeStr(document.getElementById("journey_notes").value, true);
        theJourney.type = parseInt(document.getElementById("col_type").value);
        if (await DB.addJourney(theJourney) ) {
            UI.workflowPane.innerHTML = '';
            theJourney.removeFromMap(APP.map.getLayerDataByName("Journeys"));
            APP.journeys.removeJourney(theJourney);
            //redo legs search to get table again:
            doLegsSearchAndShow(APP.legs.getWhereStr(), true, true, true, null, false);
            UI.showActionBtns(); // to enable New DB search again
            UI.SetMessage("Saved Journey. Select Legs or search for Legs in DB...", workflowMsg);
            // now will be at step 4 again: waiting for click in the map...
        } else {
            theJourney.removeFromMap(APP.map.getLayerDataByName("Journeys"));
            APP.journeys.removeJourney(theJourney);
            //redo legs search to get table again.
            doLegsSearchAndShow(APP.legs.getWhereStr(), true, true, true, null, false);
            UI.showActionBtns();
            UI.SetMessage("Saving Journey FAILED. Click in map or table to alter selection...", workflowMsg);
        }
    });
    let CancelBtn = document.getElementById("CancelBtn");
    CancelBtn.addEventListener("click", function () {
        theJourney.removeFromMap(APP.map.getLayerDataByName("Journeys"));
        APP.journeys.removeJourney(theJourney);
        //redo legs search to get table again.
        doLegsSearchAndShow(APP.legs.getWhereStr(), true, true, true, null, false);
        UI.showActionBtns();
        UI.SetMessage("Cancelled. Click in map or table to alter selection...", workflowMsg);
    });
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



