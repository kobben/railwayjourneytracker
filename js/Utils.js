/*-- ****************************
     Generic Workflow functions :
     to take results of step x to query OSM and carry results to step x+1
 */
     // returns true if successful, or unsuccessful and "retry" is cancelled
     // returns false if unsuccessful, and "retry" is chosen
/*-- **************************** -*/
async function getOSMandDoNextstep(query, outType, nextStepFunction, showIn) {
    let succes = false;
    document.body.style.cursor = "progress";
    UI.SetMessage("Querying OpenStreetMap...", workflowMsg);
    while (!succes) {
        let json = await queryOSM(query, outType);
        // console.log(json);
        if (json.succes === false) {
            const messageStr ="Error querying OSM OverPass: [" + json.status + "] "
                + json.statusText + "\nDO YOU WANT TO RETRY...?";
            succes = !confirm(messageStr);
            document.body.style.cursor = "auto";
        } else { //succces
            succes = true;
            document.body.style.cursor = "auto";
            UI.SetMessage("Ready querying OSM OverPass.", workflowMsg);
            nextStepFunction(json, showIn);
        }
    }
}
async function queryOSM(query, outType) {
    //create a proper Overpass QL call:
    const OverPassUrl = "https://overpass-api.de/api/interpreter?data=";
    const jsonFormat = "[out:json];";
    // next will be the actual query from the input param query
    // this should ALWAYS have .finalresult as the output set:
    const outSet = ".finalresult";
    const outCmd = " out " + outType + ";";
    let url = OverPassUrl + jsonFormat + query + outSet + outCmd;
    // console.log(url);

    try {
        const response = await fetch(url);
        if (response.ok) { // if HTTP-status is 200-299
            // get the response body
            let json = await response.json();
            return json; // makes function return true:
        } else {
            let jsonStr = `{"succes": false, "status": ${response.status}, "statusText": "${response.statusText}" }`;
            let json = JSON.parse(jsonStr);
            return json; // makes function return false
        }
    } catch (e) {
        let jsonStr = `{"succes": false, "status": "UNEXPECTED (is there an internet connection?)", "statusText": "" }`;
        let json = JSON.parse(jsonStr);
        return json;// makes function return false
    }
}

/*-- ************************************************************************************************************** -*/
//    VARIOUS UTILITY FUNCTIONS
/*-- ************************************************************************************************************** -*/

function calculateTravelTime(startDT, endDT) {
    const edt = new Date(endDT);
    const sdt = new Date(startDT);
    const hours= (edt - sdt) / (1000*60*60);
    const fullhours = Math.floor(hours);
    let travelTime = {
        hrs : hours,
        txt : fullhours + ':' + Math.floor(60 * (hours - fullhours))
    };
    return travelTime;
}


function getURIParameterByName(name) {
    let regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(window.location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function openURLwithCurrentLocation(theURL) {
    const curZoom = APP.map.mapView.getZoom();
    const curCenter = ol.proj.transform(APP.map.mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
    window.open(theURL + "?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom);
}

// to escape quotes, tabs, newlines in strings and text fields
// e.g. to be able to be JSON.parsed or shown in HTML
function escapeStr(theStr, alsoNewlines = true, limitLength = 0) {
    if (theStr === undefined || theStr === null) {
        theStr = "";
    }
    let re = /'/g;
    let Str = theStr.replace(re, "\'");
    re = /"/g;
    Str = Str.replace(re, "\'");
    if (alsoNewlines) {
        re = /\n/g;
        Str = Str.replace(re, "\\n");
    }
    if (limitLength > 0 && Str.length > limitLength) {
        Str = Str.slice(0, limitLength-3) + '...';
    }
    return Str;
}



//+++++++++++++++++++++++++++++++++++++++++++++++++++
// changes the WHERE statement for a PG_REST call, based on choices from HTML Forms,
//   Expects
//   - tableName = name of table in Postgres DB
//   - colNames =  array of column names in the Form (and the corresponding DB Table): ["id", "name", etc...]
// Has to be  async because there is an await(): DB lookup for stops names
// Returns the updated PGREst WHERE part of the query
async function updateWhereStr(tableName, colNames) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    let theWhereStr = "";
    let theAndOr = document.getElementById("and_or").value;
    for (let theColName of colNames) {
        let theCol = encodeURIComponent(document.getElementById("col_" + theColName).value);
        let theOp;
        if ( document.getElementById("op_" + theColName)) { // valid operator found
            theOp = document.getElementById("op_" + theColName).value;
        } else {
            theOp = "=";
        }
        if (theCol !== "") {
            if (theColName === "stopfrom" || theColName === "stopto") { // first find stopID's for the stop name provided...
                let stopsIDList = "";
                let findStopsStr = "";
                /**
                 * below is an ugly workaround for not being able to do or=() on embedded resources,
                 * asking for stopto_obj embedded for further processing, and also stopto for searching in WhereStr:
                 */
                if (theOp === "equals") {
                    findStopsStr = "name=ilike." + theCol + "";
                } else if (theOp === "contains") {
                    findStopsStr = "name=ilike.*" + theCol + "*";
                } else if (theOp === "beginswith") {
                    findStopsStr = "name=ilike.*" + theCol + "*";
                } else if (theOp === "endswith") {
                    findStopsStr = "name=ilike.*" + theCol + "";
                } else {
                    UI.SetMessage("Unknown Operator in function changeWhere()...!", errorMsg);
                }
                let matchingStops = new StopsCollection();
                await matchingStops.loadFromDB(findStopsStr);
                for (let aStop of matchingStops.getStops()) {
                    stopsIDList += aStop.id + ",";
                }
                stopsIDList = stopsIDList.substring(0, stopsIDList.length - 1); // remove , from last one...
                theWhereStr += theColName + ".in.(" + stopsIDList + "),";
                /**
                 * below is what we'd prefer to do, but cannot because of postgrest not accepting this inside an or=():
                 */
                // if (theOp === "equals") {
                //     findStopsStr = theColName +".name=ilike." + theCol + "";
                // } else if (theOp === "contains") {
                //     findStopsStr = theColName +".name=ilike.*" + theCol + "*";
                // } else if (theOp === "beginswith") {
                //     findStopsStr = theColName +".name=ilike." + theCol + "*";
                // } else if (theOp === "endswith") {
                //     findStopsStr = theColName +".name=ilike.*" + theCol + "";
                // } else {
                //     UI.SetMessage("Unknown Operator in function updateWhereStr()...!", errorMsg);
                // }
                // theWhereStr += findStopsStr + ",";
            } else { // all other colnames:
                if (theOp === "equals") {
                    theWhereStr += theColName + ".ilike." + theCol + ",";
                } else if (theOp === "contains") {
                    theWhereStr += theColName + ".ilike.*" + theCol + "*,";
                } else if (theOp === "beginswith") {
                    theWhereStr += theColName + ".ilike." + theCol + "*,";
                } else if (theOp === "endswith") {
                    theWhereStr += theColName + ".ilike.*" + theCol + ",";
                } else if (theOp === "=") {
                    theWhereStr += theColName + ".eq." + theCol + ",";
                } else if (theOp === "<") {
                    theWhereStr += theColName + ".lt." + theCol + ",";
                } else if (theOp === ">") {
                    theWhereStr += theColName + ".gt." + theCol + ",";
                } else if (theOp === "<>") {
                    theWhereStr += theColName + ".neq." + theCol + ",";
                } else if (theOp === "on") {
                    theWhereStr += theColName + ".eq." + theCol + ",";
                } else if (theOp === "before") {
                    theWhereStr += theColName + ".lt." + theCol + ",";
                } else if (theOp === "after") {
                    theWhereStr += theColName + ".gt." + theCol + ",";
                } else {
                    UI.SetMessage("Unknown Operator in function changeWhere()...!", errorMsg);
                }
            }
        }
    }
    if (theWhereStr !== '') {
        theWhereStr = theAndOr + "=(" + theWhereStr;
        theWhereStr = theWhereStr.substring(0, theWhereStr.length - 1); // remove , from last one...
        theWhereStr += ")";
    }
    // console.log('pgREST Where: ' + theWhereStr);
    return theWhereStr;
}


/*-- **************************** -*/
/*-- User Interface Functions  -*/
/*-- **************************** -*/

function reuseDateTime() {
    const theStr = "Do you want to copy the date & time from the original...?";
    return confirm(theStr);
}

function showLegOfJourney(theLegID) {
    window.open("./showlegs.html?id=" + theLegID);
}

function showJourneyOfLeg(theJourneyID) {
    window.open("./showjourneys.html?id=" + theJourneyID);
}

// ***********
// Load Search Form and wait for it to be submitted
// after submission ==> doLegsSearchAndShow
// This is in Utils.js because several APPs use it...
// ***********
function showSearchLegsForm(withSkipBtn = false, displayTable = true, displayMap = true, doNextStep = null, editable = true) {
    UI.workflowPane.innerHTML = HTML.searchLegForm(HTML.createTypesMenu(APP.legtypes, true), withSkipBtn);
    if (withSkipBtn) {
        let SkipBtn = document.getElementById("SkipBtn");
        SkipBtn.addEventListener("click",  function () {
            // if a next step was defined, just skip entirely
            if (doNextStep !== null) {
                doNextStep.call();
            } else {
                // else, to make sure we return NO legs, but we do have all data structures in place, we search for *nothing* :
                let theWhereStr = 'id=eq.-99999';
                doLegsSearchAndShow(theWhereStr, displayTable, displayMap, false, doNextStep, editable, false);
            }
        });
    }
    let SearchBtn = document.getElementById("SearchBtn");
    SearchBtn.addEventListener("click", async function () {
        let theWhereStr = await updateWhereStr('legs',
            ['id', 'km', 'stopfrom', 'stopto', 'notes', 'startdatetime', 'enddatetime', 'timesequential', 'type']);
        let zoomToExtent = document.getElementById("zoomtoextent").checked;
        let searchInBbox = document.getElementById("searchinbbox").checked;
        if (searchInBbox) { //override Zoom toExtent setting:
            zoomToExtent = false;
            document.getElementById("zoomtoextent").checked = false;
        }
        doLegsSearchAndShow(theWhereStr, displayTable, displayMap, zoomToExtent, doNextStep, editable, searchInBbox);
    });
    // ** wait for form to be submitted, then call doNextStep  **//
}

// do actual DB search and show results
// used in showSearchLegsForm() above and to redo existing searches elsewhere
// returns APP.legs and APP.legstops
async function doLegsSearchAndShow(theWhereStr, displayTable = true, displayMap = true,
                                   zoomToExtent = true, doNextStep = null, editable = true, searchInBbox = false) {
    document.body.style.cursor = "progress";
    await APP.legs.loadFromDB(theWhereStr, APP.legstops, searchInBbox);
    if (displayMap) APP.legs.mapLegs(APP.legstops, zoomToExtent);
    if (displayTable) {
        displayLegsInTable(APP.legs, false, editable);
        UI.SetMessage(APP.legs.getNumLegs() + " Legs found in DB. Click in map or table to alter selection...", workflowMsg);
    } else {
        UI.workflowPane.innerHTML = '';
    }
    // if needed, also get properties of the journeys that these legs are part of...
    if (APP.journeyprops) {
        let foundJourneyIDs = APP.legs.collectJourneysOfLegs();
        let getJourneysWhere = 'id=in.(' + foundJourneyIDs + ')';
        if (APP.journeyprops) await APP.journeyprops.loadFromDB(getJourneysWhere);
    }
    document.body.style.cursor = "auto";
    if (doNextStep !== null) doNextStep.call();
}

function displayLegsInTable(theLegs, filter = false, editable = true) {
    UI.workflowPane.innerHTML = HTML.showLegsTable(theLegs, editable, filter);
    let selectAllBtn = document.getElementById("selectAll");
    selectAllBtn.addEventListener("click", function () {
        theLegs.selectLegs(1); // 1 == all on
    });
    let selectNoneBtn = document.getElementById("selectNone");
    selectNoneBtn.addEventListener("click", function () {
        theLegs.selectLegs(0); // 0 = all off
    });
    let zoomtoBtn = document.getElementById("zoomTo");
    zoomtoBtn.addEventListener("click", function () {
        MAP.zoomToBbox(theLegs.calculateBbox(true));
    });
    let filterBtn = document.getElementById("filter");
    filterBtn.addEventListener("click", function () {
        if (filter) {
            displayLegsInTable(theLegs, false);
        } else {
            displayLegsInTable(theLegs, true);
        }
    });
    for (let aLeg of theLegs.getLegs()) {
        let selBtn = document.getElementById("select_" + aLeg.id);
        if (selBtn) { // only for those not filtered out!
            selBtn.addEventListener("click", function () {
                theLegs.selectLegs(aLeg.id); // id = toggle just this one
            });
        }
        let delBtn = document.getElementById("del_" + aLeg.id);
        if (delBtn) { // only for those not filtered out!
            delBtn.addEventListener("click", function () {
                deleteLeg(theLegs, aLeg.id);
            });
        }
        let editBtn = document.getElementById("edit_" + aLeg.id);
        if (editBtn) { // only for those not filtered out!
            editBtn.addEventListener("click", function () {
                editLeg(theLegs, aLeg.id);
            });
        }
    }
}

// used in various Leg editing functions, as indicated by comingFrom parameter...
function showSaveLegForm(theLeg, htmlElem, comingFrom) {
    UI.SetMessage("Add properties and save...", workflowMsg);
    UI.hideActionBtns();
    // if dates are NULL in DB, show them as empty string in form;
    if (theLeg.startDateTime === null || theLeg.startDateTime === 'null') theLeg.startDateTime = '';
    if (theLeg.endDateTime === null|| theLeg.endDateTime === 'null') theLeg.endDateTime = '';
    UI.workflowPane.innerHTML = HTML.editLegForm(theLeg);
    document.getElementById("col_type").selectedIndex = theLeg.type;
    let SaveBtn = document.getElementById("SaveBtn");
    SaveBtn.value = 'SAVE LEG IN DB';
    SaveBtn.addEventListener("click", function () {
        saveLegInDB(theLeg, comingFrom);
    });
    let CancelBtn = document.getElementById("CancelBtn");
    CancelBtn.addEventListener("click", function () {
        if (comingFrom === 'constructleg' ) {
            UI.workflowPane.innerHTML = '';
            UI.hideActionBtns();
            UI.SetMessage("Cancelled.", workflowMsg);
            chooseStopsForConstruction(); // go back to selected OSM relation and choosing its stops...
        } else if (comingFrom === 'mergelegs' || comingFrom === 'reverseleg' || comingFrom === 'copyleg' || comingFrom === 'truncateleg') {
            APP.map.getLayerDataByName("NewLegs").clear();
            APP.map.getLayerDataByName("NewStops").clear();
            UI.SetMessage("Cancelled. Click in map or table to alter selection...", workflowMsg);
            UI.showActionBtns();
            // redo original search
            doLegsSearchAndShow(APP.legs.getWhereStr(), true, true, false);
        } else if (comingFrom === 'drawlegs') {
            UI.workflowPane.innerHTML = '';
            UI.hideActionBtns();
            UI.SetMessage("Cancelled.", workflowMsg);
            chooseStopsForDrawing(); // go back to selected OSM relation and choosing its stops...
        } else {
            UI.showActionBtns();
            UI.SetMessage("UNEXPECTED ERROR: 'comingFrom' undefined in showSaveLegForm()", errorMsg);
            UI.SetMessage("Cancelled. ", workflowMsg);
        }
    });
}

async function saveLegInDB(theLeg, comingFrom) {
    theLeg.startDateTime = document.getElementById("leg_startdatetime").value;
    theLeg.endDateTime = document.getElementById("leg_enddatetime").value;
    theLeg.notes = escapeStr(document.getElementById("leg_notes").value, true);
    theLeg.type = document.getElementById("col_type").value;
    // console.log(theLeg);
    await DB.addStopIfNew(theLeg.stopFrom);
    await DB.addStopIfNew(theLeg.stopTo);
    if (await DB.addLeg(theLeg)) {
        UI.SetMessage("Saved Leg in DB.", workflowMsg);
        if (comingFrom === 'constructleg') {
            UI.workflowPane.innerHTML = '';
            APP.map.getLayerDataByName("NewLegs").clear();
            APP.map.getLayerDataByName("NewStops").clear();
            APP.legs.addLeg(theLeg);
            APP.legs.mapLegs(APP.legstops,false);
            UI.showActionBtns(); // to enable New DB search again
            UI.SetMessage("Saved Leg in DB. Start by selecting an OSM relation in the map...", workflowMsg);
            // now will be at step 4 again: waiting for click in the map...
        } else if (comingFrom === 'mergelegs' || comingFrom === 'reverseleg' || comingFrom === 'copyleg'
                    || comingFrom === 'truncateleg') {
            UI.workflowPane.innerHTML = '';
            APP.map.getLayerDataByName("NewLegs").clear();
            APP.map.getLayerDataByName("NewStops").clear();
            // redo original search
            UI.showActionBtns();
            doLegsSearchAndShow(APP.legs.getWhereStr(), true, true, false);
        } else if (comingFrom === 'drawlegs') {
            UI.workflowPane.innerHTML = '';
            UI.resetActionBtns();
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
                    showSearchLegsForm(true, false, true, chooseStopsForDrawing);
                }
            });
            UI.showActionBtns();
            showSearchLegsForm(true, false, true, chooseStopsForDrawing);
            UI.SetMessage("Saved Leg. Select existing Legs to show, or Skip...", workflowMsg);
        } else {
            UI.showActionBtns();
            UI.SetMessage("UNEXPECTED ERROR: 'comingFrom' undefined in saveLegInDB()", errorMsg);
            window.location = "./index.html";
        }
    }
}



/*-- ************************************************************************************************************** -*/
//    COMMON MAPPING FUNCTIONS
/*-- ************************************************************************************************************** -*/

function showOsmBboxOnMap(osmBbox, layerName) {
    // first puts osmBbox Str "(x1,y1,x2,y2)" into array:
    let bboxArray = osmBbox.substring(osmBbox.indexOf('(') + 1, osmBbox.indexOf(')'));
    bboxArray = bboxArray.split(',');
    // recalculate OSM style bbox to lonLat MultiLineString [ [[lon,lat],[lon,lat]],[...]]
    let llMultiline = [];
    let llLine = [];
    llLine.push(osm2ll([bboxArray[0], bboxArray[1]])); // ll
    llLine.push(osm2ll([bboxArray[0], bboxArray[3]])); // ul
    llLine.push(osm2ll([bboxArray[2], bboxArray[3]])); //ur
    llLine.push(osm2ll([bboxArray[2], bboxArray[1]])); //lr
    llLine.push(osm2ll([bboxArray[0], bboxArray[1]])); // ll again to close
    llMultiline.push(llLine)
    // convert to proper GeoJSON MultiLineString:
    let mercLineString = new ol.geom.MultiLineString(llMultiline).transform('EPSG:4326', 'EPSG:3857');
    let olFeature = new ol.Feature({
        geometry: mercLineString,
        id: 0,
        name: "searchBox",
    });
    APP.map.showFeatureOnMap(olFeature, layerName);
}

function showClickOnMap(clickLoc, layerName) {
    // convert to proper GeoJSON Point:
    let mercPnt = new ol.geom.Point(clickLoc);
    let olFeature = new ol.Feature({
        geometry: mercPnt,
        id: 1,
        name: "",
    });
    APP.map.showFeatureOnMap(olFeature, layerName);
}

/*-- ************************************************************************************************************** -*/
//    COMMON GEOMETRY FUNCTIONS
/*-- ************************************************************************************************************** -*/

// find two coords in a LineString and returns the part of the Linestring that is between them
// using Turf.js to also find slices when stop is not exactly on line:
function extractLegFromLine(geom, firstCoordToFind, secCoordToFind) {
    let t_line = turf.lineString(geom);
    let t_start = turf.point(firstCoordToFind);
    let t_stop = turf.point(secCoordToFind);
    let t_sliced = turf.lineSlice(t_start, t_stop, t_line);
    // console.log(t_sliced.geometry.coordinates);
    return t_sliced.geometry.coordinates;
}
// takes a line geom and reverses its direction
function reverseLineGeom(geom) {
    let reversedGeom = [];
    for (let i = 0; i < geom.length; i++) {
        reversedGeom[i] = geom[geom.length - 1 - i];
    }
    return reversedGeom;
}
// takes a Line element with descriptors and reverses/flips it fully
function flipLine(line) {
    UI.SetMessage("unexpected use of DEPRECATED function flipline [in Utils.js]", errorMsg);
    // line.geom = reverseLineGeom(line.geom);
    // let tmpInd = line.linkStartInd;
    // let tmpWhere = line.linkStartWhere;
    // line.linkStartInd = line.linkEndInd;
    // line.linkStartWhere = line.linkEndWhere;
    // line.linkEndInd = tmpInd;
    // line.linkEndWhere = tmpWhere;
    // return line;
}
//calculate OSM style bbox from set of array of coords in [lon,lat]:
function calcBbox(coords) {
    let minlat = 90;
    let minlon = 180;
    let maxlat = -90;
    let maxlon = -180;
    for (let lonlat of coords) {
        let lon = lonlat[0];
        let lat = lonlat[1];
        if (lat < minlat) minlat = lat;
        if (lat > maxlat) maxlat = lat;
        if (lon < minlon) minlon = lon;
        if (lon > maxlon) maxlon = lon;
    }
    // console.log([minlat, minlon, maxlat, maxlon]);
    return [minlat, minlon, maxlat, maxlon];
}
// switch from lon,lat to lat,lon
function ll2osm(coord) {
    return [coord[1], coord[0]];
}
// switch from lat,lon to lon,lat
function osm2ll(coord) {
    return [coord[1], coord[0]];
}
// transform lon,lat to Gmercator x,y
function ll2merc(coord) {
    return ol.proj.transform(coord, 'EPSG:4326', 'EPSG:3857');
}
// transform Gmercator x,y to lon,lat
function merc2ll(coord) {
    return ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326');
}
// change lat,lon to lon,lat and then transform to Gmercator x,y
function osm2merc(coord) {
    coord = [coord[1], coord[0]];
    return ol.proj.transform(coord, 'EPSG:4326', 'EPSG:3857');
}
// transform Gmercator to lon,lat and then change lon,lat to lat,lon
function merc2osm(coord) {
    coord = ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326');
    return [coord[0], coord[1]];
}
