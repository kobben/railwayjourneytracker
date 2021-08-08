//Globals:
let myMap, mapView;
let legsMapData, stopsMapData;
let theLegs, theWhereStr;


/*-- Initialization function --*/
async function init() {
    InitMessages("appDiv", true);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (DB.init('http://localhost:3000', authToken)) {
        SetMessage("Initializing show Legs...", workflowMsg);
        // ** step 1:
        let startAt = getParameterByName("start");
        if (startAt) {
            startAt = startAt.split(",");
            initMap(startAt[0], startAt[1], startAt[2]); //loc from params
        } else {
            initMap(6.89, 52.22, 11); //Enschede
        }
        // ** step 2:
        theWhereStr = '';
        SetMessage("Search Legs...", workflowMsg);
        let showIn = document.getElementById('workflow');
        showIn.innerHTML = HTML.searchLegForm();
        // ** wait for form to be submitted => step 3 = searchLegs() **//
    } else {
        SetMessage("Could not initialise DB connection.", errorMsg);
    }
}

/*-- end of init -*/

/*-- **************************** -*/
/*-- Workflow/Interactivity Steps:-*/
/*-- **************************** -*/


/*-- STEP 1: Initialise OSM map load legs and attached stops  -*/
function initMap(startlon,startlat,startzoom) {
    const startLocation = []; startLocation[0] = startlon; startLocation[1] = startlat;
    //define map object & link to placeholder div:
    myMap = new ol.Map({target: "mapDiv"});

    const transportOSMKey = "d4674680716f4dc7b9e5228f66cd360c";
    const osmTransportLayer = new ol.layer.Tile({
        source: new ol.source.OSM({
            attributions: [
                'Background: ©<a href="https://www.thunderforest.com/">OSM Transport</a>'],
            url:
                'https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + transportOSMKey,
        }),
    });

    const dataTemplate = {
        'type': 'FeatureCollection',
        'features': []
    };
    stopsMapData = new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(dataTemplate)
    });
    legsMapData = new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(dataTemplate)
    });

    const stopStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
                color: 'rgba(0, 0, 255, 0.4)',
            }),
            stroke: new ol.style.Stroke({
                color: 'rgba(0, 0, 255, 0.9)',
                width: 2,
            })
        }),
        text: new ol.style.Text({
            font: 'bold 12px "Open Sans", "Arial Unicode MS", "sans-serif"',
            offsetX: 10,
            offsetY: -2,
            textAlign: 'left',
            textBaseline: 'center',
            fill: new ol.style.Fill({
                color: 'rgba(0, 0, 255, 0.9)',
            }),
            stroke: new ol.style.Stroke({
                color: 'white',
                width: 4,
            }),
            // backgroundFill: new ol.style.Fill({
            //     color: 'white',
            // }),
        }),
    });
    const lineStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(0, 0, 255, 0.6)',
            width: 5,
        })
    });

    let legsMapLayer = new ol.layer.Vector({
        name: 'Legs',
        source: legsMapData,
        style: lineStyle,
    });
    let stopsMapLayer = new ol.layer.Vector({
        name: 'Stops',
        source: stopsMapData,
        style: function (feature) {
            stopStyle.getText().setText(feature.get('name'));
            return stopStyle;
        },
    });

// add layers to map:
    myMap.addLayer(osmTransportLayer);
    myMap.addLayer(stopsMapLayer); //will start out empty...
    myMap.addLayer(legsMapLayer); //will start out empty...

// create a map view:
    mapView = new ol.View({
        center: ol.proj.transform(startLocation, 'EPSG:4326', 'EPSG:3857'),
        minZoom: 2,
        maxZoom: 19,
        zoom: startzoom,
    });
    myMap.setView(mapView);

    myMap.addControl(new ol.control.Zoom());
    const mousePositionControl = new ol.control.MousePosition({
        coordinateFormat: ol.coordinate.createStringXY(4),
        projection: 'EPSG:4326',
        undefinedHTML: '&nbsp;',
    });
    myMap.addControl(mousePositionControl);
    myMap.on('pointermove', function (evt) { //mouseover info on leg
        if (evt.dragging) {
            toolTipHide();
            return;
        }
        displayFeatureInfo(myMap.getEventPixel(evt.originalEvent));
    });
    myMap.on('click', function (evt) { //selection of leg
        let idsClicked = idsFoundAtClick(myMap.getEventPixel(evt.originalEvent));
        if (idsClicked) {
            toggleClickedFeatures(idsClicked, "workflow");
        } //a click will trigger STEP 4;
    });

}
/*-- End of STEP 1  -*/



/*-- STEP 3: Load Legs & show them  -*/
async function searchLegs(theWhereStr) {
    await loadLegsFromDB(theWhereStr); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
// console.log(theLegs);
// loads all Legs found in DB, because .selected was inited to be True for all
    mapLegs(theLegs);
    zoomToLegs();
    let ZoomBtn = document.getElementById("action1Btn");
    ZoomBtn.value = 'Zoom to selected';
    ZoomBtn.style.display = "inline";
    ZoomBtn.addEventListener("click", function () {
        // zoom to legs where .selected = true
        zoomToLegs();
    });
    let SelectBtn = document.getElementById("action2Btn");
    SelectBtn.value = 'Filter selected';
    SelectBtn.style.display = "inline";
    SelectBtn.addEventListener("click", function () {
        // show only legs where .selected = true => to re-select you have to reset the selection!
        mapLegs(theLegs);
        zoomToLegs();
    });
}
/*-- End of STEP 3  -*/

// returns them as an array of objects of class Leg (see Models.js)
async function loadLegsFromDB(where) {
    theLegs = [];
    let newLeg = undefined;
    let postUrl = '/legs?' ;
    postUrl += 'select=id,name,startdatetime,enddatetime,notes,stopfrom(id,name,geojson),stopto(id,name,geojson),osmrelationid,osmrelationname,geojson';
    postUrl += '&order=startdatetime.desc.nullslast&' + where;
    // console.log(postUrl);
    let resultJSON = undefined;
    resultJSON = await DB.query("GET", postUrl);
    if (resultJSON.error === true) {
        DB.giveErrorMsg(resultJSON);
    } else {
        for (let legfound of resultJSON.data) {
            if (legfound.geojson === null || legfound.geojson === undefined) {
                SetMessage('Skipped Leg object without valid geojson: ' + legfound.id, workflowMsg);
            } else {
                newLeg = new Leg(legfound.id, legfound.name, undefined, legfound.stopfrom, legfound.stopto,
                    legfound.osmrelationid, legfound.osmrelationname, legfound.startdatetime, legfound.enddatetime, legfound.notes);
                newLeg.selected = true;
                newLeg.geometry = legfound.geojson;
                newLeg.bbox = calcBbox(legfound.geojson.coordinates);
                theLegs.push(newLeg);
                newLeg = undefined;
            }
        }
        SetMessage(theLegs.length + " Journey Legs found in DB. Click in map or table to alter selection...", workflowMsg);
    }
}


/*-- STEP 4: show legs on Map  -*/
function mapLegs(Legs) {
    stopsMapData.clear();
    legsMapData.clear();
    for (let aLeg of Legs) {
           if (aLeg.selected) {
               showFeatureOnMap(aLeg.toOlFeature(), legsMapData);
               let aStopFrom = new Stop (aLeg.stopFrom.id, aLeg.stopFrom.name, aLeg.stopFrom.geojson.coordinates);
               showFeatureOnMap(aStopFrom.toOlFeature(), stopsMapData);
               let aStopTo = new Stop (aLeg.stopTo.id, aLeg.stopTo.name, aLeg.stopTo.geojson.coordinates);
               showFeatureOnMap(aStopTo.toOlFeature(), stopsMapData);
           }
    }
    displayInTable(Legs, "workflow"); //and do step 5 for all found.
}
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

function displayInTable(Legs, htmlElem) {
    let showIn = document.getElementById(htmlElem);
    let html = '<table><tr><th>ID</th><th>Name</th><th>From</th><th>To</th><th>Start</th><th>End</th><th>Notes</th>';
    html += '<th>Selected</th><th><input type="button" onclick="selectAll()" value="All"/></th>' +
        '<th><input type="button" onclick="selectNone()"  value="None"/></th></tr>';
    for (let aLeg of theLegs) {
            if (aLeg.selected) {
                html += HTML.showLegRow(aLeg);
            }
    }
    html += '<tr><th colspan="10"></th></tr></table>';
    showIn.innerHTML = html;
}

function selectAll() {
    for (let aLeg of theLegs) {
        let isRowInTable = document.getElementById("select_" + aLeg.id);
        if (isRowInTable) {
            aLeg.selected = true;
            isRowInTable.checked = true;
        }
    }
}
function selectNone() {
    for (let aLeg of theLegs) {
        let isRowInTable = document.getElementById("select_" + aLeg.id);
        if (isRowInTable) {
            aLeg.selected = false;
            isRowInTable.checked = false;

        }
    }
}

function toggleSelect(ID) {
    for (let aLeg of theLegs) {
        if (aLeg.id === ID) {
            if (aLeg.selected) {
                aLeg.selected = false;
            } else {
                aLeg.selected = true;
            }
        }
    }
}


//zoom to bbox of set of objects that have a BBox:
function zoomToLegs() {
    let bboxChanged = false;
    let minlat = 90;
    let minlon = 180;
    let maxlat = -90;
    let maxlon = -180;
    for (let aLeg of theLegs) {
        if (aLeg.bbox) {
            if (aLeg.selected) {
                bboxChanged = true;
                if (aLeg.bbox[0] < minlat) minlat = aLeg.bbox[0];
                if (aLeg.bbox[1] < minlon) minlon = aLeg.bbox[1];
                if (aLeg.bbox[2] > maxlat) maxlat = aLeg.bbox[2];
                if (aLeg.bbox[3] > maxlon) maxlon = aLeg.bbox[3];
            }
        } else {
            SetMessage("ERROR in zoomToObjs(objs): One or more Objects have no (valid) BBOX!", errorMsg);
        }
    }
    // console.log([minlat, minlon, maxlat, maxlon]);
    if (bboxChanged) zoomMapToBbox([minlat, minlon, maxlat, maxlon]) ;
}

/*-- Edit selected Leg  -*/
function editLeg(ID,htmlElem) {
    for (let aLeg of theLegs) {
        if (aLeg.id === ID) {
            document.getElementById("action1Btn").style.display = "none";
            document.getElementById("action2Btn").style.display = "none";
            SetMessage("Edit properties and save...", workflowMsg);
            let showIn = document.getElementById(htmlElem);
            const html = HTML.editLegForm(aLeg);
            showIn.innerHTML = html;
            let SaveBtn = document.getElementById("action3Btn");
            SaveBtn.value = 'SAVE CHANGES';
            SaveBtn.style.display = "inline";
            // console.log(aLeg);
            SaveBtn.addEventListener("click", function () {
                aLeg.startDateTime = document.getElementById("leg_startdatetime").value;
                aLeg.endDateTime = document.getElementById("leg_enddatetime").value;
                aLeg.name = escapeStr(document.getElementById("leg_name").value);
                aLeg.notes = escapeStr(document.getElementById("leg_notes").value);
                if (DB.patchLeg(aLeg, ID)) {
                    // await loadLegsFromDB(theWhereStr);
                    mapLegs(theLegs);
                    zoomToLegs();
                    document.getElementById("action1Btn").style.display = "inline";
                    document.getElementById("action2Btn").style.display = "inline";
                    document.getElementById("action3Btn").style.display = "none";
                    SetMessage("Edited Leg. Click in map or table to alter selection...", workflowMsg);
                }
            });
        }
    }
}

/*-- Delete selected Leg  -*/
async function delLeg(ID) {
    const theStr = `Are you REALLY sure you want to delete this Leg [id=${ID}]?\nThis action can NOT be undone!`;
    if ( confirm(theStr) ) {
       if (await DB.deleteLeg(ID)) {
           for (let i=0;i<theLegs.length;i++) {
               theLegs[i].selected = true;
               if (theLegs[i].id === ID) {
                   theLegs.splice(i, 1);
               }
           }
           SetMessage("Deleted Leg. Now " +theLegs.length
               + " Journey Legs available. Click in map or table to alter selection...", workflowMsg);
           await loadLegsFromDB(theWhereStr);
           mapLegs(theLegs);
           zoomToLegs();
       }
    }
}


//+++++++++++++++++++++++++++++++++++++++++++++++++++
function changeWhere() {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    theWhereStr = "";
    let theAddDatesStr = "";
    let theAndOr = document.getElementById("and_or").value;
    const allColNames = ["id","name","stopfrom","stopto","notes","startdatetime","enddatetime"];
    for (let theColName of allColNames) {
        let theCol = document.getElementById("col_"+theColName).value;
        let theOp = document.getElementById("op_"+theColName).value;
        if (theCol !== "") {
            if (theOp === "equals") {
                theWhereStr += theColName + ".ilike." +  theCol + ",";
            } else if (theOp === "contains") {
                theWhereStr += theColName + ".ilike.*" +  theCol + "*,";
            } else if (theOp === "beginswith") {
                theWhereStr += theColName + ".ilike." +  theCol + "*,";
            } else if (theOp === "endswith") {
                theWhereStr += theColName + ".ilike.*" +  theCol + ",";
            } else if (theOp === "=") {
                theWhereStr += theColName + ".eq." +  theCol + ",";
            } else if (theOp === "<") {
                theWhereStr += theColName + ".lt." +  theCol + ",";
            } else if (theOp === ">") {
                theWhereStr += theColName + ".gt." +  theCol + ",";
            } else if (theOp === "<>") {
                theWhereStr += theColName + ".neq." +  theCol + ",";
            } else if (theOp === "on") {
                theWhereStr += theColName + ".eq." +  theCol + ",";
            } else if (theOp === "before") {
                theWhereStr += theColName + ".lt." +  theCol + ",";
            } else if (theOp === "after") {
                theWhereStr += theColName + ".gt." +  theCol + ",";
            } else {
                SetMessage("Unknown Operator in function changeWhere()...!", errorMsg);
            }
        }
    }
    if (theWhereStr !== '') {
        theWhereStr = theAndOr + "=(" + theWhereStr;
        theWhereStr = theWhereStr.substring(0,theWhereStr.length-1); // remove , from last one...
        theWhereStr += ")";
    }
}
