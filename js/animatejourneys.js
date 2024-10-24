// ***************************************************************//
// ANIMTEJOURNEYS
// this APP lets you search Journeys in a DB, and then animate them in various ways.
//
// v1.1  June 2023, see README.md for details
// ***************************************************************//
//
// we create a global APP obj here:
let APP = {
    name: "animateJourneys",
    url: "animateJourneys.html",
    // needed for postREST DB access:
    authToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw",
    map: undefined,
    allstops: undefined, //always need a collection of all existing stops for various tasks
    // legstops: undefined, //these are the stops that are end- or startpoint of the selected legs
    // alllegs: undefined,
    journeys: undefined,
    // legtypes: undefined,
    journeytypes: undefined,
    restart: function () {
        const curZoom = this.map.mapView.getZoom();
        const curCenter = ol.proj.transform(this.map.mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
        location.replace(this.url + "?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom);
    }
};

/*-- Initialization function --*/
async function initAnimateJourneys() {
    UI.InitMessages(true);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (await DB.init('http://localhost:3000', authToken)) {
        UI.SetMessage("Initializing AnimteJourneys...", workflowMsg);
// ***********
// ** step 1:
// ***********
        let startWithJourneyID = getURIParameterByName("id");
        let startAt = getURIParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            APP.map = MAP.init("AnimateJourneysMap", [startAt[0], startAt[1]], startAt[2], null); //loc from params
        } else {
            APP.map = MAP.init("AnimateJourneysMap", [6.89, 52.22], 10, null);  //Enschede
        }
        APP.map.StopStyle = MAP.stopStyleBlue;
        APP.map.StopSelectedStyle = MAP.stopStyleRed;
        APP.map.LegStyle = MAP.lineStyleBlue;
        APP.map.LegSelectedStyle = MAP.lineStyleRed;
        APP.map.JourneyStyle = MAP.lineStyleNone;
        APP.map.JourneySelectedStyle = MAP.lineStyleRed;
        APP.map.displayLayer("OSM", false);
        APP.map.displayLayer("OSMTransport", true);
        APP.map.displayLayer("openRailwayMap", false);
        APP.map.displayLayer("Legs", false);
        APP.map.displayLayer("Stops", true);
        APP.map.displayLayer("NewLegs", false);
        APP.map.displayLayer("NewStops", false);
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
            doJourneySearchAndShow(theWhereStr, false, true, true, null);
        }
        showSearchJourneysForm(false, false, true);
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
                showSearchJourneysForm(false,false, true);
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
function showSearchJourneysForm(withSkipBtn = false, displayTable = false, displayMap = true, doNextStep = null) {
    UI.workflowPane.innerHTML = HTML.searchJourneyForm(HTML.createTypesMenu(APP.journeytypes, true), withSkipBtn);
    if (withSkipBtn) {
        let SkipBtn = document.getElementById("SkipBtn");
        SkipBtn.addEventListener("click",  function () {
            // if a next step was defined, just skip entirely
            if (doNextStep !== null) {
                doNextStep.call();
            } else {
                // else, to make sure we return NO legs, but we do have all data structures in place, search for *nothing* :
                let theWhereStr = 'id=eq.-99';
                doJourneySearchAndShow(theWhereStr, displayTable, displayMap, false, doNextStep);
            }
        });
    }
    let SearchBtn = document.getElementById("SearchBtn");
    SearchBtn.addEventListener("click", async function () {
        let theWhereStr = await updateWhereStr('journeys', ['id','notes', 'type','stopfrom', 'stopto', 'startdatetime', 'enddatetime']);
        let zoomToExtent = document.getElementById("zoomtoextent").checked;
        await doJourneySearchAndShow(theWhereStr, displayTable, displayMap, zoomToExtent, doNextStep);

///*****************************************
        animateJourneys();

    });
    // ** wait for form to be submitted, then next step  **//
}

// do actual DB search and show results
// used in showSearchLegsForm() above and to redo existing searches elsewhere
// returns APP.legs and APP.legstops
async function doJourneySearchAndShow(theWhereStr, displayTable = true, displayMap = true,
                                   zoomToExtent = true, doNextStep = null) {
    await APP.journeys.loadFromDB(theWhereStr);
    UI.SetMessage(APP.journeys.getNumJourneys() + " Journeys found in DB...", workflowMsg);
    if (displayMap) APP.journeys.mapJourneys(zoomToExtent);

    if (displayTable) {
        displayJourneysInTable(APP.journeys, false);
    } else {
        UI.workflowPane.innerHTML = '';
    }
    if (doNextStep !== null) doNextStep.call();



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




///*****************************************
// ANIMATE TEST

async function animateJourneys() {
    await sleep(1000);
    let JJ = APP.journeys.getJourneys();
    const noJourneys = JJ.length;
    for (j=noJourneys-1;j>=0;j--) {
        let aJourney = JJ[j];
        let LL = aJourney.getLegsCollection().getLegs();
        const noLegs = LL.length;
        for (l=0;l<noLegs;l++) {
            let aLeg=LL[l];
            highlightLegOfJourney(aJourney.getID(), aLeg.getID(), true);
            APP.map.mapObj.render();
            console.log('j=' + j + '; l=' + l);
            await sleep(1000);
            highlightLegOfJourney(aJourney.getID(), aLeg.getID(), false);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
