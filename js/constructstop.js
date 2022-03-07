//Globals:
let myMap, mapView;
let osmClicked;
let legsData, stopsData, newStopsData;
let allStops; // create one global version

/*-- Initialization function --*/
async function initConstructStops() {
    UI.InitMessages(true);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (DB.init('http://localhost:3000', authToken)) {
        UI.SetMessage("Initializing leg construction...", workflowMsg);// first load all stops for use in menus etc.
        allStops = await loadStopsFromDB(''); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
        let startAt = getParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            initMap([startAt[0], startAt[1]], startAt[2], findOSMstop); //location from params
        } else {
            initMap([6.89, 52.22], 11, findOSMstop);  //Enschede
            // initMap([14.0, 48.5], 5, findOSMrelation); //Europe
        }
        mapStops(allStops, stopsData);
        UI.SetMessage("Start by selecting an OSM stop in the map, or click elsewhere to create new...", workflowMsg);
        // step 1 done, waiting for mapclick to trigger step 2...
    } else {
        UI.SetMessage("Could not initialise DB connection.", errorMsg);
    }
}

/*-- end of init -*/

/*-- **************************** -*/
/*-- Workflow/Interactivity Steps:-*/
/*-- **************************** -*/


/*-- Generic function to take results of step x to query OSM and carry results to step x+1:   -*/
// in Functions.js
/*-- End of getOSMandDoNextstep  -*/
/*-- End of STEP 1  -*/

/*-- STEP 2: map was clicked, check which OSMStops are near  -*/
function findOSMstop(evt) {
    //first remove stops & lines if they are shown:
    newStopsData.clear();
    legsData.clear();
    let curZoom = mapView.getZoom();
    UI.resetActionBtns();
    if (curZoom <= 14) {
        UI.SetMessage("Zoom in further to select stops!", workflowMsg);
    } else {
        let mercClicked = evt.coordinate;
        osmClicked = merc2osm(mercClicked); // OL reports lon-lat & OSM needs lat-lon
        const searchSizeBase = 50.000;
        // base = 50 works out same ca 175 pixels width (square only at equator) in all zoom levels
        // searchsize in degrees at zoomlevel 1,  halfs for every zoom step down:
        let searchSizeLon = searchSizeBase / (2 ** (curZoom - 1));
        // compensate for mercator distortion, very approx. gets square on Mid European latitudes
        let searchSizeLat = searchSizeLon * 0.6666;
        let osmBbox = "(" + (osmClicked[1] - searchSizeLat) + "," + (osmClicked[0] - searchSizeLon) + "," +
            (osmClicked[1] + searchSizeLat) + "," + (osmClicked[0] + searchSizeLon) + ")";
        showOsmBboxOnMap(osmBbox, legsData);
        showClickOnMap(mercClicked, newStopsData);
        // query should ALWAYS have .finalresult as the output set:
        let query = '(';
        query += 'node["railway"="station"] ' + osmBbox + ';'
        query += 'node["railway"="stop"] ' + osmBbox + ';'
        query += 'node["railway"="halt"] ' + osmBbox + ';'
        query += ')';
        query += '->.finalresult;';
        // console.log(query);
        getOSMandDoNextstep(query, "body", showFoundStops, "workflow");
    }
}

/*-- End of STEP 2  -*/

/*-- STEP 3: List the OSMstops found and let the user choose one  -*/
function showFoundStops(json, htmlElem) {
    const mainKeys = ["ref", "name"];
    let showIn = document.getElementById(htmlElem);
    let html = "";
    let numStops = json.elements.length;
    if (numStops === 0) {
        UI.SetMessage("No stops found.", workflowMsg);
        html = "<b>Click elsewhere to search further</b>, or ";
        html += "<button id='createStopFromClick'>Create Stop at click Location</button>";
        // if button is clicked => /***** step 4a: Create stop from click ****/
        showIn.innerHTML = html;
        let CreateBtn = document.getElementById("createStopFromClick");
        CreateBtn.addEventListener("click", function() {
            const id = Math.floor(Math.random()*9999) + 999;
            console.log("created id = " + id);
            const name = 'new_name';
            const coords = osmClicked;
            showSaveStopForm(new Stop(id, name, coords), "workflow");
        });
    } else {
        UI.SetMessage("Found " + numStops + " stops. Select the stop you want to use...", workflowMsg);
        html += "<table class='selector'>";
        //header:
        html += "<tr>";
        html += "<th class='selector'>" + stop.id + "</th>";
        for (let tagKey of mainKeys) {
            html += "<th class='selector'>" + tagKey + "</th>";
        }
        html += "<th class='selector'>" + "other tags" + "</th>";
        html += "</tr>";
        // create html table rows:
        for (let stop of json.elements) {
            let tagKeys = Object.keys(stop.tags);
            html += "<tr class='selector' id=" + stop.id + ">";
            //main keys separate:
            html += "<td>" + stop.id + "</td>";
            for (let tagKey of mainKeys) {
                html += "<td>" + stop.tags[tagKey] + "</td>";
            }
            //all others in last column:
            html += "<td>";
            for (let tagKey of tagKeys) {
                if (!mainKeys.includes(tagKey)) {
                    html += tagKey + "=" + stop.tags[tagKey] + "; ";
                }
            }
            html += "</td>";
            html += "</tr>";
        }
        html += "</table>";
        showIn.innerHTML = html;
        // create onclick events for rows:
        for (let stop of json.elements) {
            // let query = 'node(' + stop.id + ')' + ' -> .finalresult;';
            let row = document.getElementById(stop.id);
            row.addEventListener("click", function (event) {
                let id = stop.id;
                let coords = [stop.lon,stop.lat];
                let name = stop.tags.name;
                showSaveStopForm(new Stop(id,name, coords), "workflow");
                // if row is clicked => /***** step 4b: Create stop from OSM data ****/
            });
        }
    }
}
/*-- End of STEP 3  -*/

/*-- STEP 4: show form to save stop in DB: -*/
function showSaveStopForm(theStop, htmlElem) {
    document.getElementById("action1Btn").style.display = "none";
    document.getElementById("action2Btn").style.display = "none";
    UI.SetMessage("Fill in properties and save...", workflowMsg);
    let showIn = document.getElementById(htmlElem);
    const tmpGEOJSON = JSON.stringify(theStop.geometry);
    /*-- Submit of this Form will trigger STEP 5  -*/
    const html = HTML.saveStopForm(theStop);
    showIn.innerHTML = html;
    let SaveBtn = document.getElementById("SaveBtn");
    SaveBtn.addEventListener("click", function() {
        theStop.id = document.getElementById("stop_id").value;
        theStop.name = document.getElementById("stop_name").value;
        saveStop(theStop);
    });
    let CancelBtn = document.getElementById("CancelBtn");
    CancelBtn.addEventListener("click", function () {
            document.getElementById("workflow").innerHTML = '';
            UI.SetMessage("Cancelled. Start by selecting an OSM stop in the map......", workflowMsg);
    });
}
/*-- End of STEP 4  -*/

/*-- STEP 5: save the constructed leg in DB: -*/
async function saveStop(theStop) {
    let stopAdded = await DB.addStop(theStop.id,theStop.name,theStop.geometry);
    if (stopAdded) {
        UI.SetMessage("Saved Stop in DB.", workflowMsg);
        document.getElementById("workflow").innerHTML = '';
        document.getElementById("action3Btn").style.display = "none";
        document.getElementById("action2Btn").style.display = "none";
        document.getElementById("action1Btn").style.display = "none";
        newStopsData.clear();
        //** ...and we go back to the end of step 1, waiting for a click in the map....
        const curCenter = ol.proj.transform(mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
        const curZoom = mapView.getZoom();
        window.location="./constructstop.html?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
    }
}
/*-- End of STEP 5  -*/



