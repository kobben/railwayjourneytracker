/**
 * HTML.js:
 * HTML templates for forms, tables, etc. using JS templating
 * @author Barend Kobben - b.j.kobben@utwente.nl
 * @version 2.0 [Aug 2021]
 *
 */
//


// Create  dropdowm <option> list of stops currently in DB


HTML = {

//+++++++++++++++++++++++++++++++++++++++++++++++++++
    createStopsOptions: function (theStops, startWithEmpty) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let html = '';
        if (startWithEmpty) html += "<option value=''>--</option>";
        for (let aStop of theStops.getStops()) {
            html += `<option value="${aStop.id}">${aStop.name}</option>`;
        }
        return html;
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    createStopsTableRows: function (OSMstops, fromOrTo) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let html = '';
        for (let aStop of OSMstops) {
            if (fromOrTo === 'from') {
                html+= `<tr class="selector" onclick="pickFromStop(${aStop.id}, '${aStop.name}')" id="from_${aStop.id}"><td>${aStop.name}</td><td>${aStop.id}</td></tr>`;
            } else {
                html+= `<tr class="selector" onclick="pickToStop(${aStop.id}, '${aStop.name}')"  id="to_${aStop.id}"><td>${aStop.name}</td><td>${aStop.id}</td></tr>`;
            }
        }
        return html;
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    createLegsButtons: function (theJourney, asColumn = true) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    let html = '';
    for (let aLegID of theJourney.getLegIDs()) {
        html += '<button  id="btn_' + aLegID + '" ' +
            ' onmouseover="highlightLegOfJourney(' + theJourney.getID() + ',' + aLegID + ', true)"' +
            ' onmouseout="highlightLegOfJourney(' + theJourney.getID() + ',' + aLegID + ', false)"' +
            ' onclick="showLegOfJourney(' + aLegID + ')"' +
            '>' + aLegID + '</button>';
        if (asColumn) {
            html += '<br/>';
        }
    }
    return html;
    },
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    findTypeName: function (theTypes, id) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let result = undefined;
        for (let theType of theTypes) {
            if (theType.id === parseInt(id)) {
                result = theType.name;
            }
        }
        if (result === undefined) {
            UI.SetMessage("UNEXPECTED Error in findTypeName(" + id + ")", errorMsg);
        }
        return result;
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    formatDateTime: function (DTS) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let theStr = '';
        if (DTS === null || DTS === undefined) {
            return '–';
        } else {
            let DT = new Date(DTS);
            let HH = DT.getHours();
            let MM = DT.getMinutes();
            let options = {year: '2-digit', month: 'short', day: 'numeric'};
            theStr += DT.toLocaleString("en-UK", options);
            if (HH === 0 && MM === 0) {
                return theStr;
            } else {
                theStr += ' ' + HH + ':' + ((MM < 10) ? '0' + MM : MM);
                return theStr;
            }
        }
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    replaceBR: function (Str) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let regExp = /\n/g; // cathes "real" nextline
        Str = Str.replace(regExp, "<br/>");
        regExp = /\\n/g; // catches \n char in string tb replaced
        Str = Str.replace(regExp, "<br/>");
        return Str;
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    // Create  dropdowm <option> list of types
    createTypesMenu: function (typesFound, startWithEmpty) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let optionslist = '<select id="col_type" name="col_type">';
        if (startWithEmpty) optionslist += '<option value="" selected> </option>';
        for (let typeFound of typesFound) {
            optionslist += '<option value=' + typeFound.id + '>' + typeFound.name + '</option>';
        }
        optionslist += '</select>';
        return optionslist;
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    mapInfoPopup: function (layerName, feature, count, total) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let html = '';
        if (layerName === 'Legs') {
            html += `
<tr><td colspan="2">LEG (${HTML.findTypeName(APP.legtypes, feature.get('type'))})</td></tr>
<tr><td>From:</td><td>${feature.get('stopFromName')}</td></tr>
<tr><td>To:</td><td>${feature.get('stopToName')}</td></tr>
<tr><td>Start:</td><td>${HTML.formatDateTime(feature.get('startDateTime'))}</td></tr>
<tr><td>End:</td><td>${HTML.formatDateTime(feature.get('endDateTime'))}</td></tr>
<tr><td>Notes:</td><td>${escapeStr(feature.get('notes'), false, 32)}</td></tr>
`;
        } else if (layerName === 'Journeys') {
            let theJourney = undefined;
            for (aJourney of APP.journeys.getJourneys()) {
                if (aJourney.getLegIDs().includes(feature.get('id'))) {
                    theJourney = aJourney;
                    html += `
<tr><td colspan="2">JOURNEY (${HTML.findTypeName(APP.journeytypes, theJourney.type)})</td></tr>
<tr><td>From:</td><td>${theJourney.stopFrom.name}</td></tr>
<tr><td>To:</td><td>${theJourney.stopTo.name}</td></tr>
<tr><td>Start:</td><td>${HTML.formatDateTime(theJourney.startDateTime)}</td></tr>
<tr><td>End:</td><td>${HTML.formatDateTime(theJourney.endDateTime)}</td></tr>
<tr><td>Notes:</td><td>${escapeStr(theJourney.notes, false, 32)}</td></tr>
`;
                }
            }
        } else if (layerName === 'Stops') {
            html += `
<tr><td>Stop:</td><td>${feature.get('name')} [${feature.get('id')}]</td></tr>
`;
        } else {
            html += '<strong>Invalid Popup layerName!</strong>';
        }
        if (count < total && total > 1) {
            html += '<tr class="plain"><td colspan="2"><hr/></td>';
        }
        return html;
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    journeyLegInfoPopup: function (theLeg) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let html =
`<table>
  <tr><td colspan="2">LEG (${HTML.findTypeName(APP.legtypes, theLeg.type)})</td></tr>
  <tr><td>From:</td><td>${theLeg.stopFrom.name}</td></tr>
  <tr><td>To:</td><td>${theLeg.stopTo.name}</td></tr>
  <tr><td>Start:</td><td>${HTML.formatDateTime(theLeg.startDateTime)}</td></tr>
  <tr><td>End:</td><td>${HTML.formatDateTime(theLeg.endDateTime)}</td></tr>
  <tr><td>Notes:</td><td>${escapeStr(theLeg.notes, false, 32)}</td></tr>
</table>`;
        return html;
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    truncateStopsForm: function (DBStops) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        const curZoom = APP.map.mapView.getZoom();
        const curCenter = ol.proj.transform(APP.map.mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
        const constructStopLink = "./constructstops.html?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
        let html = '';
        html += `
<table>
    <tr>
      <th>Select Stops to truncate Leg:</th>
      <th style="text-align: right">
          <button class="bigbutton" type="button" id="CancelBtn">Cancel</button>     
          <button class="bigbutton" type="button" id="RefreshStopsBtn">Refresh Stop Menus</button>     
          <button class="bigbutton" type="button" id="TruncateBtn">TRUNCATE THE LEG</button>     
        </th>
     </tr>
    <tr style='vertical-align: top'><td> 
        <table > 
            <tr>
            <td><b>Choose START from stops in DB:</b></td>   
            </tr>
            <tr><td>
            <select id='menu_from'>
            ${HTML.createStopsOptions(DBStops, true)}</select>
            </td></tr>
        </table> 
    </td>   
    <td>
        <table >
            <tr>
            <td ><b>Choose END from stops in DB:</b></td>     
            </tr>
              <tr><td>
            <select id='menu_to' >
            ${this.createStopsOptions(DBStops, true)}</select>
            </td></tr>
        </table>
    </td></tr>
<tr><td colspan='2'>If stops not present in DB, first create them using the APP 
<a href="${constructStopLink}" target="_blank">'Get Stop from OSM or Create new Stop'</a> and then return here and click REFRESH Stops...</td></tr>
</table>
`;
        return html;
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    constructLegForm: function (OSMStops, DBStops) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        const curZoom = APP.map.mapView.getZoom();
        const curCenter = ol.proj.transform(APP.map.mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
        const constructStopLink = "./constructstops.html?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
        let html = '';
        html += `
<table class="tableFixHead">
    <tr>
     <thead> <th colspan="4" style="text-align: right">
          <button class="bigbutton" type="button" id="CancelBtn">Cancel</button>
          <button class="bigbutton" type="button" id="RefreshStopsBtn">Refresh Stops</button>
          <button class="bigbutton" type="button" id="ConstructBtn">CONSTRUCT LEG FROM ... TO ...</button>     
        </th></thead>
    </tr>
    <tr style='vertical-align: top'>
    <td>
     <table > 
            <tr>
            <td colspan='2'>CHOOSE <b>START</b> FROM RELATION STOPS:</td> 
            </tr>
            <tr>
                <th >Name</th>
                <th >ID</th>   
            </tr>
             ${HTML.createStopsTableRows(OSMStops, "from")}
        </table> 
    </td>
    <td> 
        <table > 
            <tr>
            <td><b>...or from stops in DB:</b></td>   
            </tr>
            <tr><td>
            <select id='menu_from'>
            ${HTML.createStopsOptions(DBStops, true)}</select><br/>
            If stops not in DB, first create them using the APP<br/>
            <a href="${constructStopLink}" target="_blank">
            'Get Stop from OSM or Create new Stop'</a><br/>
             and then return and click Refresh Stops...
            </td></tr>
        </table> 
    </td>   
    <td>
    <table > 
            <tr>
            <td colspan='2'>CHOOSE <b>END</b> FROM RELATION STOPS:</td>   
            </tr>
            <tr>
                <th >Name</th>
                <th >ID</th>      
            </tr>
             ${HTML.createStopsTableRows(OSMStops, "to")}
        </table> 
    </td>
    <td>
        <table >
            <tr>
            <td ><b>...or from stops in DB:</b></td>     
            </tr>
              <tr><td>
            <select id='menu_to' >
            ${this.createStopsOptions(DBStops, true)}</select><br/>
            If stops not in DB, first create them using the APP<br/>
            <a href="${constructStopLink}" target="_blank">
            'Get Stop from OSM or Create new Stop'</a><br/>
             and then return and click Refresh Stops...
            </td></tr>
        </table>
    </td>
    </tr>

</table>
`;
        return html;
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    drawLegForm: function (DBStops) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        const curZoom = APP.map.mapView.getZoom();
        const curCenter = ol.proj.transform(APP.map.mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
        const constructStopLink = "./constructstops.html?start=" + curCenter[0] + "," + curCenter[1] + "," + curZoom;
        let html = '';
        html += `
<table >
    <tr>
     <thead> <th colspan="2" style="text-align: right">
          <button class="bigbutton" type="button" id="RefreshStopsBtn">Refresh Stops</button>
        </th></thead>
    </tr>
    <tr style='vertical-align: top'>
    <td> 
        <table > 
            <tr>
            <td><b>CHOOSE START FROM STOPS IN DB:</b></td>   
            </tr>
            <tr><td>
            <select id='menu_from'>
            ${HTML.createStopsOptions(DBStops, true)}</select><br/>
            If stops not in DB, first create them using the APP<br/>
            <a href="${constructStopLink}" target="_blank">
            'Get Stop from OSM or Create new Stop'</a><br/>
             and then return and click Refresh Stops...
            </td></tr>
        </table> 
    </td>   
    <td>
        <table >
            <tr>
            <td><b>CHOOSE END FROM STOPS IN DB:</b></td>   
            </tr>
              <tr><td>
            <select id='menu_to' >
            ${this.createStopsOptions(DBStops, true)}</select><br/>
            If stops not in DB, first create them using the APP<br/>
            <a href="${constructStopLink}" target="_blank">
            'Get Stop from OSM or Create new Stop'</a><br/>
             and then return and click Refresh Stops...
            </td></tr>
        </table>
    </td>
    </tr>

</table>
`;
        return html;
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    importLegForm: function () {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        const fromCoord = osm2ll(APP.fromStop.geometry.coordinates);
        const toCoord = osm2ll(APP.toStop.geometry.coordinates);
        const signalLink = "https://signal.eu.org/osm/#locs=" + fromCoord + ";" + toCoord;
        console.log(signalLink);
        let html = '';
        html += `
<table >
    <tr>
     <thead> <th colspan="1" style="text-align: right">
       
     Paste a valid GeoJSON LineString below. Create e.g. in GIS or the <b><a href="${signalLink}" target="_blank">Railway Routing</a></b> site.
     <input class="bigbutton" id="CancelBtn" type="button" value="Cancel" />
     <input class="bigbutton" id="ImportBtn" type="button" value="IMPORT" /></td>
        </th></thead>
    </tr>
    <tr style='vertical-align: top'>
        <td><textarea id="geom" name="geom" cols="120" rows="10"></textarea></td>
    </tr>

</table>
`;
        return html;
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    searchLegForm: function (legTypesMenu, withSkipBtn = false) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `
<form id="searchForm" name="searchForm">
<table class="tableInput">
<tr>
    <th colspan="5">SEARCH FOR LEGS THAT: 
     <select name="and_or" id="and_or" >
     <option value="or" selected>comply to at least one of the search criteria (logical OR)</option>
     <option value="and"  >comply to all search criteria (logical AND)</option>
    </select> 
    </th>
  <th colspan="3" style="text-align: right">
      <button class="bigbutton" type="reset"  name="reset" id="reset">Clear Form</button>
      ${withSkipBtn ? '<input class="bigbutton" type="button" name="skip" id="SkipBtn" value="Skip/Cancel"/>' : ''}      
      <input class="bigbutton" type="button" name="search" id="SearchBtn" value="START SEARCH" />
      <input type="checkbox" name="zoomtoextent" id="zoomtoextent" checked>Zoom to extent
    </th>
 </tr>
<tr>
    <td class="colname">ID:
    </td>
    <td>
        <select name="op_id" id="op_id"  >
            <option value="=" selected>=</option>
            <option value="<" >&lt</option>
            <option value=">">&gt;</option>
            <option value="<>">&ne;</option>
        </select>
    </td>
    <td>
        <input id="col_id" name="id" type="number"  > 
    </td>
    <td colspan="6"></td>
</tr>
<tr >
    <td class="colname">From:</td>
    <td>
        <select name="op_stopfrom" id="op_stopfrom"  >
            <option value="contains" selected>contains</option>
            <option value="equals">equals</option>
            <option value="beginswith">begins with</option>
            <option value="endswith">ends with</option>
        </select>
    </td>
    <td>
        <input id="col_stopfrom" name="stopfrom" type="text" size="25" maxLength="255"  />
    </td>
    <td class="colname">To:</td>
    <td>
        <select name="op_stopto" id="op_stopto"  >
            <option value="contains" selected>contains</option>
            <option value="equals">equals</option>
            <option value="beginswith">begins with</option>
            <option value="endswith">ends with</option>
        </select>
    </td>
    <td>
        <input id="col_stopto" name="stopto" type="text" size="25" maxLength="255"  />
    </td>
    <td colspan="2"></td>
</tr>
<tr >
    <td class="colname">Start:
    </td> 
    <td>
        <select name="op_startdatetime" id="op_startdatetime"  >
        <option value="=" >at</option>
        <option value="<" >before</option>
        <option value=">" selected>after</option>
        </select>
    </td>
    <td>
        <input id="col_startdatetime" name="startdatetime" type="text" size="25" maxLength="64" />
    </td>
    <td class="colname">End:
    </td>
    <td>
        <select name="op_enddatetime" id="op_enddatetime"  >
        <option value="=" >at</option>
        <option value="<" selected>before</option>
        <option value=">">after</option>
        </select>
    </td>
    <td>
        <input id="col_enddatetime" name="enddatetime" type="text" size="25" maxLength="64"  >
         <span class="tableInput" >[yyyy-mm-ddThh:mm] </span> 
    <td class="colname">&nbsp; &nbsp; Sequential: </td>
    <td> 
        <select id="col_timesequential" name="timesequential"  >
            <option value="" selected></option>
            <option value="false" >false</option>
            <option value="true">true</option>
        </select>
    </td>
</tr>   
<tr >

      <td class="colname">Type:</td>
            <td></td>
            <td>
                ${legTypesMenu}
            </td>

    <td class="colname">Notes: </td>
    <td >
        <select name="op_notes" id="op_notes"  >
            <option value="contains" selected>contains</option>
            <option value="equals">equals</option>
            <option value="beginswith">begins with</option>
            <option value="endswith">ends with</option>
        </select>
    </td>

    <td colspan="4">
        <input id="col_notes" name="notes" type="text" size="65" maxLength="255"  > 
    </td>
</tr>
<tr><td colspan="8"></td></tr>
</table>

    </form>
    `; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    searchJourneyForm: function (journeyTypesMenu, withSkipBtn = false) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `
<form id="searchForm" name="searchForm">

<table class="tableInput">
<tr>
    <th colspan="5">SEARCH FOR JOURNEYS THAT: 
     <select name="and_or" id="and_or" >
     <option value="and"  >comply to all search criteria (logical AND)</option>
        <option value="or" selected>comply to at least one of the search criteria (logical OR)</option>
    </select> 
    </th>
  <th colspan="3" style="text-align: right">
      <button class="bigbutton" type="reset"  name="reset" id="reset">Clear Form</button>
      ${withSkipBtn ? '<input class="bigbutton" type="button" name="skip" id="SkipBtn" value="Skip/Cancel"/>' : ''}      
      <input class="bigbutton" type="button" name="search" id="SearchBtn" value="START SEARCH" />
      <input type="checkbox" name="zoomtoextent" id="zoomtoextent" checked>Zoom to extent
    </th>
 </tr>
<tr>

    <td class="colname">ID:
    </td>
    <td>
        <select name="op_id" id="op_id"  >
            <option value="=" selected>=</option>
            <option value="<" >&lt</option>
            <option value=">">&gt;</option>
            <option value="<>">&ne;</option>
        </select>
    </td>
    <td>
        <input id="col_id" name="id" type="number"  > 
    </td>
    
    <td colspan="5">
       
    </td>
</tr>
<tr >
    <td class="colname">From:</td>
    <td>
        <select name="op_stopfrom" id="op_stopfrom"  >
            <option value="contains" selected>contains</option>
            <option value="equals">equals</option>
            <option value="beginswith">begins with</option>
            <option value="endswith">ends with</option>
        </select>
    </td>
    <td>
        <input id="col_stopfrom" name="stopfrom" type="text" size="25" maxLength="255"  />
    </td>
    <td class="colname">To:</td>
    <td>
        <select name="op_stopto" id="op_stopto"  >
            <option value="contains" selected>contains</option>
            <option value="equals">equals</option>
            <option value="beginswith">begins with</option>
            <option value="endswith">ends with</option>
        </select>
    </td>
    <td>
        <input id="col_stopto" name="stopto" type="text" size="25" maxLength="255"  />
    </td>
    <td colspan="2"></td>
</tr>
<tr >
    <td class="colname">Start:
    </td> 
    <td>
        <select name="op_startdatetime" id="op_startdatetime"  >
        <option value="=" >at</option>
        <option value="<" >before</option>
        <option value=">" selected>after</option>
        </select>
    </td>
    <td>
        <input id="col_startdatetime" name="startdatetime" type="text" size="25" maxLength="64" />
    </td>
    <td class="colname">End:
    </td>
    <td>
        <select name="op_enddatetime" id="op_enddatetime"  >
        <option value="=" >at</option>
        <option value="<" selected>before</option>
        <option value=">">after</option>
        </select>
    </td>
    <td>
        <input id="col_enddatetime" name="enddatetime" type="text" size="25" maxLength="64"  >
         <span class="tableInput" >[yyyy-mm-ddThh:mm] </span> 
    <td colspan="2"></td>
</tr>
<tr >
      <td class="colname">Type:</td>
            <td></td>
            <td>
                ${journeyTypesMenu}
            </td>

    <td class="colname">Notes: </td>
    <td >
        <select name="op_notes" id="op_notes"  >
            <option value="contains" selected>contains</option>
            <option value="equals">equals</option>
            <option value="beginswith">begins with</option>
            <option value="endswith">ends with</option>
        </select>
    </td>

    <td colspan="4">
        <input id="col_notes" name="notes" type="text" size="65" maxLength="255"  > 
    </td>
</tr>
<tr><td colspan="8"></td></tr>
</table>

    </form>
    `; // do NOT forget closing `; !!
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    searchOSMrelationIDForm: function () {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `

<form id="searchOSMrelationIDForm" name="searchOSMrelationIDForm">
<table class="tableInput">
    <tr><th colspan="4" style="text-align: right"><input class="bigbutton" id="relationIdBtn" type="button" value="SHOW" /></th></tr>
    <tr>
     <td>OSMrelationID:</td><td><input id="osm_id"  type="number" /></td>
     <td><input id="premerge"  type="checkbox" checked/></td><td>Try automatic pre-merge</td>
    </tr>
</table>
</form>
    `; // do NOT forget closing `; !!
    },
//+++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    searchStopForm: function () {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `
<form id="searchForm" name="searchForm">
<table class="tableInput">
<tr><th colspan="4">Search for records that: 
  <select name="and_or" id="and_or" >
    <option value="and"  >comply to all search criteria (logical AND)</option>
    <option value="or" selected>comply to at least one of the search criteria (logical OR)</option>
  </select> </th>
 <th colspan="2" style="text-align: right">
  <button class="bigbutton" type="reset"  name="reset" id="reset">Clear Form</button>
  <input class="bigbutton" type="button" id="SearchBtn" value="START SEARCH" />
  <input type="checkbox" name="zoomtoextent" id="zoomtoextent" checked>Zoom to extent
</th>
</tr>
        <tr>
            <td class="colname">ID:
            </td>
            <td>
                <select name="op_id" id="op_id" >
                    <option value="=" selected>=</option>
                    <option value="<" >&lt;</option>
                    <option value=">">&gt;</option>
                    <option value="<>">&ne;</option>
                </select>
            </td>
            <td>
                <input id="col_id" name="id" type="number" "> 
            </td>
            <td class="colname">Name:
            </>
            <td>
                <select name="op_name" id="op_name" ">
                    <option value="contains" selected>contains</option>
                    <option value="equals">equals</option>
                    <option value="beginswith">begins with</option>
                    <option value="endswith">ends with</option>
                </select>
            </td>
            <td>
                <input id="col_name" name="name" type="text" size="40" maxLength="255" >  
            </td>
        </tr>
        
<tr><td colspan="8"></td></tr>
</table>
    </form>
    `; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    editJourneyForm: function (theJourney) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `
<table class="tableInput">
        <tr >
            <th colspan="5" style="text-align: right">
                <button id="CancelBtn" class="bigbutton">Cancel</button> 
                <button id="SaveBtn" class="bigbutton">SAVE CHANGES</button> 
            </th>
        </tr>
        <tr >
            <td class="colname">ID: </td>
            <td class="colname" style="text-align: left">${theJourney.id}</td>
            <td class="colname">Type: </td>
            <td class="colname" style="text-align: left">${HTML.createTypesMenu(APP.journeytypes, false)}</td>     
            <td class="colname" rowSpan="4" style="text-align: center; align-content: center; vertical-align: top">
                Legs:<br>${HTML.createLegsButtons(theJourney, true)} </td>
            <td rowSpan="4" class="detailbox" id="leg_details"></td>
        </tr>  
        
        <tr >
            <td class="colname">From:
            </td>
            <td>
                ${theJourney.stopFrom.name} [${theJourney.stopFrom.id}] 
            </td>
            <td class="colname">To:</td>
            <td>
                ${theJourney.stopTo.name} [${theJourney.stopTo.id}] 
            </td>
        </tr>
        <tr >
            <td class="colname">Start:
            </td>
            <td>${(theJourney.startDateTime === '' || theJourney.startDateTime === 'null') ? '-' : HTML.formatDateTime(theJourney.startDateTime)}</td>
            <td class="colname">End: 
            <td>${(theJourney.endDateTime === '' || theJourney.endDateTime === 'null') ? '-' : HTML.formatDateTime(theJourney.endDateTime)}</td>
        </tr>      
        <tr >
            <td  class="colname">Notes: </td>
            <td colspan="3">
                <textarea cols="60" rows="8" id="journey_notes" name="notes" wrap="soft">${theJourney.notes}</textarea> 
            </td>
        </tr>
        <tr ><td colspan="5"></td></tr>
       </table>
       
`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    editLegForm: function (theLeg) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `
<table class="tableInput">
        <tr >
            <th colspan="4" style="text-align: right">
                <button id="CancelBtn" class="bigbutton">Cancel</button> 
                <button id="SaveBtn" class="bigbutton">SAVE CHANGES</button> 
            </th>
        </tr>
        <tr >
            <td class="colname">ID: </td>
            <td class="colname" style="text-align: left">${theLeg.id}</td>
            <td class="colname">Type:</td>
            <td>
                ${this.createTypesMenu(APP.legtypes, false)}
            </td>
        </tr>
        <tr >
            <td class="colname">From:
            </td>
            <td>
                ${theLeg.stopFrom.name} [${theLeg.stopFrom.id}] 
            </td>
            <td class="colname">To:</td>
            <td>
                ${theLeg.stopTo.name} [${theLeg.stopTo.id}] 
            </td>
        </tr>
        <tr >
            <td class="colname">Start:
            </td>
            <td>
                <input id="leg_startdatetime" name="startdatetime" type="text" size="20" 
                maxLength="20" value="${theLeg.startDateTime}" ></td>
            <td class="colname">End: </td>
            <td>
                <input id="leg_enddatetime" name="enddatetime" type="text" size="20" 
                maxLength="20" value="${theLeg.endDateTime}" >
                 [YYYY-MM-DDThh:mm]
            </td>
        </tr>      
        <tr >
            <td  class="colname">Notes: </td>
            <td colspan="3">
                <textarea cols="75" rows="3" id="leg_notes" name="notes" wrap="soft">${theLeg.notes}</textarea> 
            </td>
        </tr>
        <tr >
            <td  class="colname">Geometry:</td>
            <td colspan="3">
<!--                <a onClick="alert('Cannot edit JSON...')"> -->
                ${escapeStr(JSON.stringify(theLeg.geometry), true).slice(0, 120) + ' ...'}
<!--                </a> -->
            </td>
        </tr>
        <tr ><td colspan="4"></td></tr>
       </table>
`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    editStopForm: function (theStop) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `
<table class="tableInput">
    <tr >
        <th colspan="4" style="text-align: right"><button id="CancelBtn" class="bigbutton">Cancel</button>
        <button id="SaveBtn" class="bigbutton">SAVE CHANGES</button> </th>
    </tr>
    <tr >
        <td class="colname">ID:
        </td>
        <td>
           ${theStop.id} 
        </td>
        <td class="colname">Name:
        </td>
        <td>
            <input id="stop_name" name="name" type="text" size="40" maxLength="255" 
            value="${theStop.name}"> 
        </td>
    </tr>      
</table>

`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    stopsAsPulldown: function (theStops) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let html = `
<table class="tableFixHead"><tr><thead><th>ID</th><th>Name</th>
<th>Select:</th><th style="text-align: center"><input type="button" style="height:20px;width:60px" id="selectNone" value="none"/><br>
<input type="button" style="height:20px;width:60px" id="selectAll" value="all"/></th>
<th style="text-align: center"><input type="button" style="height:20px;width:60px" id="zoomTo" value="zoomto"/><br>
<input type="button" style="height:20px;width:60px" id="filter" value="${filter ? 'unfilter' : 'filter'}"/></th>
</tr></thead>
`;
        for (let aStop of theStops.getStops()) {
            if (!filter || aStop.selected) {
                // rows created below get clickable btns with unique IDs that get an AddEventListener in main cade
                html += `  
<tr>
	<td>${aStop.id}</td>
	<td>${aStop.name}</td>
	<td><input type="checkbox" id="select_${aStop.id}" ${aStop.selected ? 'checked' : ''} /></td>
`;
                if (editable) html += `
	<td><input type="button" id="edit_${aStop.id}" value="EDIT" /></td>
	<td><input type="button" id="del_${aStop.id}" value="DEL" /></td>
`;
            }
        }
        html += '</tr><tr><th colspan="5"></th></tr></table>';
        return html;
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    showStopsTable: function (theStops, editable = true, filter = false) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let html = `
<table class="tableFixHead"><tr><thead><th>ID</th><th>Name</th>
<th>Select:</th><th style="text-align: center"><input type="button" style="height:20px;width:60px" id="selectNone" value="none"/><br>
<input type="button" style="height:20px;width:60px" id="selectAll" value="all"/></th>
<th style="text-align: center"><input type="button" style="height:20px;width:60px" id="zoomTo" value="zoomto"/><br>
<input type="button" style="height:20px;width:60px" id="filter" value="${filter ? 'unfilter' : 'filter'}"/></th>
</tr></thead>
`;
        for (let aStop of theStops.getStops()) {
            if (!filter || aStop.selected) {
                // rows created below get clickable btns with unique IDs that get an AddEventListener in main cade
                html += `  
<tr>
	<td>${aStop.id}</td>
	<td>${aStop.name}</td>
	<td><input type="checkbox" id="select_${aStop.id}" ${aStop.selected ? 'checked' : ''} /></td>
`;
                if (editable) html += `
	<td><input type="button" id="edit_${aStop.id}" value="EDIT" /></td>
	<td><input type="button" id="del_${aStop.id}" value="DEL" /></td>
`;
            }
        }
        html += '</tr><tr><th colspan="5"></th></tr></table>';
        return html;
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    showJourneysTable: function (theJourneys, editable = true, filter = false) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let html = `
<table class="tableFixHead"><thead>
<tr><th>ID</th><th>From</th><th>To</th><th>Start</th><th>End</th><th>Type</th><th>Legs</th><th>Notes</th>
<th>Select:</th><th style="text-align: center"><input type="button" style="height:20px;width:60px" id="selectNone" value="none"/><br>
<input type="button" style="height:20px;width:60px" id="selectAll" value="all"/></th>
<th style="text-align: center"><input type="button" style="height:20px;width:60px" id="zoomTo" value="zoomto"/><br>
<input type="button" style="height:20px;width:60px" id="filter" value="${filter ? 'unfilter' : 'filter'}"/></th>
</tr></thead>
`;
        for (let aJourney of theJourneys.getJourneys()) {
            if (!filter || aJourney.selected) {
                // rows created below get clickable btns with unique IDs that get an AddEventListener in main cade
                html += `  
<tr>
	<td>${aJourney.id}</td>
	<td>${aJourney.stopFrom.name}</td>
	<td>${aJourney.stopTo.name}</td>
	<td>${(aJourney.startDateTime === '' || aJourney.startDateTime === 'null') ? '-' : HTML.formatDateTime(aJourney.startDateTime)}</td>
	<td>${(aJourney.endDateTime === '' || aJourney.endDateTime === 'null') ? '-' : HTML.formatDateTime(aJourney.endDateTime)}</td>
	<td>${HTML.findTypeName(APP.journeytypes, aJourney.type)}</td>
	<td>${HTML.createLegsButtons(aJourney, false)}</td>
	<td>${HTML.replaceBR(aJourney.notes)}</td>
	<td style="text-align: center"><input type="checkbox" id="select_${aJourney.id}"  ${aJourney.selected ? 'checked' : ''} /></td>
`;
                if (editable) html += `
	<td style="text-align: center"><input type="button" id="edit_${aJourney.id}" value="EDIT" /></td>
	<td style="text-align: center"><input type="button" id="del_${aJourney.id}" value="DEL" /></td>
`;
            }
        }
        html += '</tr><tr><th colspan="12"></th></tr></table>';
        return html;
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    showLegsTable: function (theLegs, editable = true, filter = false) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let html = `
<table class="tableFixHead"><thead>
<tr><th>ID</th><th>From</th><th>To</th><th>Start</th><th>End</th><th>Seq.</th><th>Type</th><th>Notes</th>
<th>Select:</th><th style="text-align: center"><input type="button" style="height:20px;width:60px" id="selectNone" value="none"/><br>
<input type="button" style="height:20px;width:60px" id="selectAll" value="all"/></th>
<th style="text-align: center"><input type="button" style="height:20px;width:60px" id="zoomTo" value="zoomto"/><br>
<input type="button" style="height:20px;width:60px" id="filter" value="${filter ? 'unfilter' : 'filter'}"/></th>
</tr></thead>
`;
        for (let aLeg of theLegs.getLegs()) {
            if (!filter || aLeg.selected) {
                // rows created below get clickable btns with unique IDs that get an AddEventListener in main cade
                html += `  
<tr>
	<td>${aLeg.id}</td>
	<td>${aLeg.stopFrom.name}</td>
	<td>${aLeg.stopTo.name}</td>
	<td>${(aLeg.startDateTime === '' || aLeg.startDateTime === 'null') ? '-' : HTML.formatDateTime(aLeg.startDateTime)}</td>
	<td>${(aLeg.endDateTime === '' || aLeg.endDateTime === 'null') ? '-' : HTML.formatDateTime(aLeg.endDateTime)}</td>
	<td>${(aLeg.timesequential) ? '<span style="font-size: 1.5em">✓︎︎</span>' : ''}</td>
	<td>${HTML.findTypeName(APP.legtypes, aLeg.type)}</td>
	<td>${HTML.replaceBR(aLeg.notes)}</td>
	<td><input type="checkbox" id="select_${aLeg.id}" ${aLeg.selected ? 'checked' : ''} /></td>
`;
                if (editable) html += `
	<td><input type="button" id="edit_${aLeg.id}" value="EDIT" /></td>
	<td><input type="button" id="del_${aLeg.id}" value="DEL" /></td>
`;
            }
        }
        html += '</tr><tr><th colspan="12"></th></tr></table>';
        return html;
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    showOSMobjectsTable: function (osmObjects, mainKeys) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let html = '<table class="tableFixHead"><tr><thead><th>ID</th>';
        for (let tagKey of mainKeys) {
            html += "<th>" + tagKey + "</th>";
        }
        html += "<th>other tags</th></tr>";
        for (let aRec of osmObjects) {
            let tagKeys = Object.keys(aRec.tags);
            html += "<tr class='selector' id=" + aRec.id + ">";
            //main keys separate:
            html += "<td>" + aRec.id + "</td>";
            for (let tagKey of mainKeys) {
                html += "<td>" + aRec.tags[tagKey] + "</td>";
            }
            //all others in last column:
            html += "<td>";
            for (let tagKey of tagKeys) {
                if (!mainKeys.includes(tagKey)) {
                    html += tagKey + "=" + aRec.tags[tagKey] + "; ";
                }
            }
            html += "</td></tr>";
        }
        html += "</table>";
        return html;
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++


} //end HTML object