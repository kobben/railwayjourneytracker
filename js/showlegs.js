//Globals:
let myMap, mapView;
let legsMapData, stopsMapData;
let allLegs;


/*-- Initialization function --*/
async function init() {
    InitMessages("appDiv", true);
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2FjY2VzcyJ9.faLSEypbd-MDlb6r6zDG6iAdCKgthe6lHML3zEziVRw";
    if (DB.init('http://localhost:3000', authToken)) {
        SetMessage("Initializing show Legs...", workflowMsg);
        // step 1:
        initMap();
        // step 2:
        await loadLegsFromDB(''); // 'where' uses PostGREST syntax, eg. notes=ilike.*interrail*
        console.log(allLegs);
        // step 3: loads all Legs, because .selected was inited to be True for all
        mapLegs(allLegs);
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
            mapLegs(allLegs);
            zoomToLegs();
        });
        SetMessage(allLegs.length + " Journey Legs found in DB. Click in map or table to alter selection...", workflowMsg);
    } else {
        SetMessage("Could not initialise DB connection.", errorMsg);
    }
}

/*-- end of init -*/

/*-- **************************** -*/
/*-- Workflow/Interactivity Steps:-*/
/*-- **************************** -*/


/*-- STEP 1: Initialise OSM map load legs and attached stops  -*/
function initMap() {
    const startLocation = [6.79, 52.26]; // Hengelo in lon, lat
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
        //center coords and zoom level:
        center: ol.proj.transform(startLocation, 'EPSG:4326', 'EPSG:3857'),
        minZoom: 2,
        maxZoom: 19,
        zoom: 11,
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


/*-- STEP 2: load legs from DB  -*/
// returns them as an array of objects of class Leg (see Models.js)
async function loadLegsFromDB(where) {
    allLegs = [];
    let postUrl = '/legs?' ;
    postUrl += 'select=id,name,startdatetime,enddatetime,notes,stopfrom(id,name,geojson),stopto(id,name,geojson),osmrelationid,osmrelationname,geojson';
    postUrl += '&order=startdatetime.desc.nullslast&' + where;
    // console.log(postUrl);
    let resultJSON = await DB.query("GET", postUrl);
    if (resultJSON.error === true) {
        DB.giveErrorMsg(resultJSON);
    } else {
        for (let legfound of resultJSON.data) {
            let loadedLeg = new Leg(legfound.id, legfound.name, undefined, legfound.stopfrom, legfound.stopto, legfound.osmrelationid, legfound.osmrelationname, legfound.startdatetime, legfound.enddatetime, legfound.notes);
            if (legfound.geojson === null || legfound.geojson === undefined) {
                SetMessage('Skipped Leg object without valid geojson: ' + legfound.id, workflowMsg);
            } else {
                loadedLeg.selected = true;
                loadedLeg.geometry = legfound.geojson;
                loadedLeg.bbox = calcBbox(legfound.geojson.coordinates);
                allLegs.push(loadedLeg);
            }
        }
        loadedLeg = null;
    }
}
/*-- End of STEP 2  -*/


/*-- STEP 2: show legs on Map  -*/
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
    displayInTable(Legs, "workflow"); //and do step 4 for all found.
}

/*-- End of STEP 3  -*/

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
    for (let aLeg of allLegs) {
            if (aLeg.selected) {
                html += TMPL.showLegRow(aLeg);
            }
    }
    html += '<tr><th colspan="10"></th></tr></table>';
    showIn.innerHTML = html;
}

function selectAll() {
    for (let aLeg of allLegs) {
        let isRowInTable = document.getElementById("select_" + aLeg.id);
        if (isRowInTable) {
            aLeg.selected = true;
            isRowInTable.checked = true;
        }
    }
}
function selectNone() {
    for (let aLeg of allLegs) {
        let isRowInTable = document.getElementById("select_" + aLeg.id);
        if (isRowInTable) {
            aLeg.selected = false;
            isRowInTable.checked = false;

        }
    }
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
}


//zoom to bbox of set of objects that have a BBox:
function zoomToLegs() {
    let bboxChanged = false;
    let minlat = 90;
    let minlon = 180;
    let maxlat = -90;
    let maxlon = -180;
    for (let aLeg of allLegs) {
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
function editLeg(ID) {
    alert('Not implemented yet....');
}

/*-- Delete selected Leg  -*/
function delLeg(ID) {
    alert('Not implemented yet....');
}