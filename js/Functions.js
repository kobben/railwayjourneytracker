

/*-- **************************** -*/
/*-- Map Functions                -*/
/*-- **************************** -*/

let displayFeatureInfo = function (pixel) {
    let feature = myMap.forEachFeatureAtPixel(pixel, function (feature) {
        return feature;
    });
    if (feature) {
        SetMessage(feature.get('name'), dataMsg, [pixel[0] + 13, pixel[1] + 14]);
    } else {
        toolTipHide();
    }
};

function idsFoundAtClick (pixel) {
    let idsFound = [];
    let feature = myMap.forEachFeatureAtPixel(pixel, function (feature) {
        idsFound.push(feature.get('id'));
    });
    return idsFound;
};

function zoomMapToBbox(osmBbox) {
    //takes in OSM bbox and zooms map to merc bbox
    let ll = osm2merc([osmBbox[0], osmBbox[1]]);
    let ur = osm2merc([osmBbox[2], osmBbox[3]]);
    // console.log(ll[0], ll[1], ur[0], ur[1]);
    mapView.fit([ll[0], ll[1], ur[0], ur[1]], {padding: [40, 40, 40, 40]});
}

function showOsmBboxOnMap(osmBbox, mapLayer) {
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
    showFeatureOnMap(olFeature, mapLayer);
}


function showFeatureOnMap(olFeature, mapLayer) {
    mapLayer.addFeature(olFeature);
}



/*-- **************************** -*/
/*-- Various Spatial Utility Functions  -*/
/*-- **************************** -*/

//takes to coordinate pairs c1 and c2 and returns true if they're equal.
function isEqual(c1, c2) {
    if (c1 !== undefined && c2 !== undefined) {
        if (c1[0] === c2[0] && c1[1] === c2[1]) {
            return true;
        }
    }
    return false;
}


// takes a (possibly) unordered MultiLineString (from an OSMrelation and returns as 1 Linestring,
// ordered from start to end, and without duplicate coords
// Assumes the OSMrelation MultiLineString is logically consistent:
//  - only 2 lines connect to only one other line (i.e. these are the start and end lines)
//  - all others connect to two other lines, no gaps are present
function MultiLineString2LineString(geom) {
    let theLines = [];
    let inGeom = geom;
    let outGeom = [];
    const first = 0;
    let i = 0;
    // loop 1: get details for all segments and their connections:
    for (let geomPart of inGeom) {
        let theLine = {
            ind: i,
            last: geomPart.length - 1,
            geom: geomPart,
            linkStartInd: -1, //-1=none, otherwise index of connection
            linkStartWhere: 0, // 0=nowhere, 1=atStart, 2=atEnd
            linkEndInd: -1, //-1=none, otherwise index of connection
            linkEndWhere: 0, // 0=nowhere, 1=atStart, 2=atEnd
        }
        i++;
        let j = 0;
        // innerloop 1-1: compares with all others except itself and checks for connections:
        for (let geomPart of inGeom) {
            let last = geomPart.length - 1;
            // check for all lines except the current one:
            if (j !== theLine.ind) {
                if (isEqual(geomPart[first], theLine.geom[first])) {
                    // console.log('matched start to start');
                    theLine.linkStartInd = j;
                    theLine.linkStartWhere = 1;
                }
                if (isEqual(geomPart[last], theLine.geom[first])) {
                    // console.log('matched start to end');
                    theLine.linkStartInd = j;
                    theLine.linkStartWhere = 2;
                }
                if (isEqual(geomPart[first], theLine.geom[theLine.last])) {
                    // console.log('matched end to start');
                    theLine.linkEndInd = j;
                    theLine.linkEndWhere = 1;
                }
                if (isEqual(geomPart[last], theLine.geom[theLine.last])) {
                    // console.log('matched end to end');
                    theLine.linkEndInd = j;
                    theLine.linkEndWhere = 2;
                }
            }
            j++;
        }
        theLines.push(theLine);
    }
    //loop 2: do some checking for possible problems:
    i = 0;
    let dangleCount = 0;
    let disconnectCount = 0;
    let danglers =[]; let disconnects =[];
    for (let theLine of theLines) {
        if (theLine.linkStartInd === -1 || theLine.linkEndInd === -1) {
            danglers.push(theLine.ind);
            dangleCount++;
        }
        if (theLine.linkStartInd === -1 && theLine.linkEndInd === -1) {
            disconnects.push(theLine.ind);
            disconnectCount++;
        }
        i++;
    }
    let Msg = disconnectCount + ' disconnected elements found: ' + disconnects + '\n' +
        dangleCount + ' dangling elements found: ' + danglers + '\n';
    if (dangleCount !== 2 || disconnectCount !== 0) {
        SetMessage(Msg, errorMsg);
        return undefined;
    } else {
        SetMessage(Msg, hideMsg);
        // Now start constructing the Line out of the elements
        //start at first dangling line:
        startInd = theLines[danglers[0]].ind;
        endInd = theLines[danglers[1]].ind;
        let curLine = theLines[startInd];
        if (curLine.linkEndInd === -1) {
            //dongle is on End, reverse it:
            curLine = flipLine(curLine);
        }
        for (let i=0;i<=curLine.last;i++) {
            outGeom.push(curLine.geom[i]); //add ALL starting line coords to outGeom
        }
        let lastNotDone = true;
        while (lastNotDone) {
            let connectionFlipped = (curLine.linkEndWhere === 2); //check if next line is flipped
            curLine = theLines[curLine.linkEndInd]; //load next line
            if (connectionFlipped) {curLine = flipLine(curLine);} // flip if necessary
            for (let i=1;i<=curLine.last;i++) {
                outGeom.push(curLine.geom[i]); //add ALL starting line coords to outGeom EXCEPT 1st connecting pair!
            }
            if (curLine.ind === endInd) {lastNotDone = false;} // if it's last dangler, make loop end
        }
        return outGeom;
    }
}


// find two coords in a LineString and returns the part of the Linestring that holds them
function extractLegFromLine(geom, firstCoordToFind, secCoordToFind) {
    let firstFoundAt = -1;
    let secFoundAt = -1;
    let i = 0;
    for (let coords of geom) {
        if (isEqual(coords, firstCoordToFind)) {
            // console.log('matched start coord[' + i + ']');
            firstFoundAt = i;
        }
        if (isEqual(coords, secCoordToFind)) {
            // console.log('matched end coord[' + i + ']');
            secFoundAt = i;
        }
        i++;
    }
    // do some error checking:
    let error = false; Msg ='Error in extractLegFromLine: ';
    if (firstFoundAt === -1) { error = true; Msg += 'Start Stop not found in relation Line.'}
    if (secFoundAt === -1) { error = true; Msg += 'End Stop not found in relation Line.'}
    if (secFoundAt === firstFoundAt) { error = true; Msg += 'Start & End Stop are the same.'}
    if (error) {
        SetMessage(Msg, errorMsg);
        SetMessage('Aborted construction', hideMsg);
        return undefined;
    } else {
        if (firstFoundAt < secFoundAt) {
            return geom.slice(firstFoundAt, secFoundAt);
        } else { // flipping needed
            return reverseLineGeom(geom.slice(secFoundAt, firstFoundAt));
        }
    }
}

function findStopCoords(stopId, stops) {
    let coordsFound;
    let foundOne = 0;
    for (let stop of stops) {
        if (stop.id === stopId) {
            // stopsCoordsOrdered.push(stop);
            coordsFound = stop.geometry.coordinates;
            foundOne++;
        }
    }
    if (foundOne === 0) {
        return stopId + "] not found!";
    } else if (foundOne > 1) {
        return stopId + "] found multiple times!";
    } else {
        return coordsFound;
    }
}

// takes a Line element with descriptors and reverses/flips it fully
function flipLine(line) {
    line.geom = reverseLineGeom(line.geom);
    tmpInd = line.linkStartInd;
    tmpWhere = line.linkStartWhere;
    line.linkStartInd =  line.linkEndInd;
    line.linkStartWhere=  line.linkEndWhere;
    line.linkEndInd =  tmpInd;
    line.linkEndWhere=  tmpWhere;
    return line;
}

// takes a line geom and reverses its direction
function reverseLineGeom(geom) {
    let reversedGeom = [];
    for (let i = 0; i < geom.length; i++) {
        reversedGeom[i] = geom[geom.length - 1 - i];
    }
    return reversedGeom;
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
    return [coord[1], coord[0]];
}

/*-- **************************** -*/
/*-- Various Utility Functions  -*/
/*-- **************************** -*/

// to escape quotes, tabs, newlines in strings and text fields to be able to be JSON.parsed
function escapeStr(theStr) {
    let re = /'/g;
    theStr = theStr.replace(re, "\'");
    re = /"/g;
    theStr = theStr.replace(re, "\'");
    re = /\n/g;
    theStr = theStr.replace(re, "\\n");
    return theStr;
}

//reset action Btns:
function resetActionBtns() {
    for (i = 1; i <= 3; i++) {
        let Btn = document.getElementById("action" + i + "Btn");
        Btn.value = 'ACTION' + i;
        Btn.style.display = "none";
    }
}


/*-- END of Calculation functions -*/