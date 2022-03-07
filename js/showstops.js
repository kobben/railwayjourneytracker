//Globals:
let myMap, mapView;
let stopsData;
let theStops, theWhereStr;


/*-- Initialization function --*/
async function initShowStops() {
    UI.InitMessages(true);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (await DB.init('http://localhost:3000', authToken)) {
        UI.SetMessage("Initializing show Stops...", workflowMsg);
        // ** step 1:
        let startAt = getParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            initMap([startAt[0], startAt[1]], startAt[2], selectClickedStop); //loc from params
        } else {
            initMap([6.89, 52.22], 11, selectClickedStop);  //Enschede
        }
        /*-- ********** -*/
        // ** step 2:
        theWhereStr = '';
        UI.SetMessage("Search Stops...", workflowMsg);
        let showIn = document.getElementById('workflow');
        showIn.innerHTML = HTML.searchStopForm();
        // ** wait for form to be submitted => step 3 = searchStops() **//
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
    let idsClicked = idsFoundAtClick(myMap.getEventPixel(evt.originalEvent));
    if (idsClicked) {
        toggleClickedFeatures(idsClicked);
    }
}


/*-- STEP 3: Load Stops & show them  -*/
async function searchStops(theWhereStr) {
    theStops = undefined;
    theStops = await loadStopsFromDB(theWhereStr); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
    UI.SetMessage(theStops.length + " Stops found in DB. Click in map or table to alter selection...", workflowMsg);
    mapStops(theStops);
    zoomToStops(true);
    displayInTable(theStops, "workflow");
    let NewSearchBtn = document.getElementById("action1Btn");
    NewSearchBtn.value = 'New DB Search';
    NewSearchBtn.style.display = "inline";
    NewSearchBtn.addEventListener("click", function () {
        // new search of stops from DB
        UI.resetActionBtns();
        UI.SetMessage("Search Stops...", workflowMsg);
        let showIn = document.getElementById('workflow');
        showIn.innerHTML = HTML.searchStopForm();
        // ** wait for form to be submitted => step 3 = searchStops() **//
    });
    let ZoomBtn = document.getElementById("action2Btn");
    ZoomBtn.value = 'Zoom to selected';
    ZoomBtn.style.display = "inline";
    ZoomBtn.addEventListener("click", function () {
        // zoom to stops where .selected = true
        zoomToStops(false);
    });
    // let SelectBtn = document.getElementById("action2Btn");
    // SelectBtn.value = 'Do *something* with selection';
    // SelectBtn.style.display = "inline";
    // SelectBtn.addEventListener("click", function () {
    //      // eg ...?
    // });
}
/*-- End of STEP 3  -*/

/*-- STEP 4: show stops on Map  -*/
// in Functions.js: function mapStops(Stops)
/*-- End of STEP 4  -*/

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
                html += HTML.showEditStopRow(aStop);
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
    if (bboxChanged) zoomMapToBbox([minlat, minlon, maxlat, maxlon]) ;
    if (warnings !== 0) UI.SetMessage("WARNING: ' + warnings + ' objects have no (valid) coordinates!", errorMsg);
}

/*-- Edit selected Stop  -*/
function editStop(ID,htmlElem) {
    for (let aStop of theStops) {
        if (aStop.id === ID) {
            UI.SetMessage("Edit properties and save...", workflowMsg);
            let showIn = document.getElementById(htmlElem);
            const html = HTML.editStopForm(aStop);
            showIn.innerHTML = html;
            let SaveBtn = document.getElementById("SaveBtn");
            SaveBtn.addEventListener("click", function () {
                aStop.name = escapeStr(document.getElementById("stop_name").value);
                if (DB.patchStop(aStop, ID)) {
                    displayInTable(theStops, "workflow");
                    UI.SetMessage("Edited Stop. Click in map or table to alter selection...", workflowMsg);
                }
            });
            let CancelBtn = document.getElementById("CancelBtn");
            CancelBtn.addEventListener("click", function () {
                displayInTable(theStops, "workflow");
                UI.SetMessage("Cancelled Editing. Click in map or table to alter selection...", workflowMsg);
            });
        }
    }
}

/*-- Delete selected Stop  -*/
async function delStop(ID) {
    const theStr = `Are you REALLY sure you want to delete this Stop [id=${ID}]?\nThis action can NOT be undone!`;
    if ( confirm(theStr) ) {
       if (await DB.deleteStop(ID)) {
           for (let i=0;i<theStops.length;i++) {
               theStops[i].selected = true;
               if (theStops[i].id === ID) {
                   theStops.splice(i, 1);
               }
           }
           UI.SetMessage("Deleted Stop. Now " +theStops.length
               + " Journey Stops available. Click in map or table to alter selection...", workflowMsg);
           theStops = await loadStopsFromDB(theWhereStr);
           mapStops(theStops);
           zoomToStops(true);
           displayInTable(theStops, "workflow");
       }
    }
}

