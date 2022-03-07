/**
 * HTML.js:
 * HTML templates for forms, tables, etc. using JS templating
 * @author Barend Kobben - b.j.kobben@utwente.nl
 * @version 1.0 [Aug 2021]
 *
 */
// 2885956

HTML = {

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
    showChooseStopsForm: function (fromStopsRows, toStopsRows, fromStopsMenu, toStopsMenu) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !

        return `
<table>
    <tr style='vertical-align: top'><td> 
        <table class="tableFixHead"> 
            <thead><tr>
            <td colspan='2'><b>CHOOSE START FROM RELATION STOPS:</b></td>        
    <td>Or from stops in DB:</td>
            </tr>
            <tr>
                <th >ID</th>
                <th >Name</th>   
                <td>${fromStopsMenu}</td>
            </tr>
            </thead>
            ${fromStopsRows}
        </table> 
    </td>   
    <td>
        <table class="tableFixHead">
            <thead><tr>
            <td colspan='2'><b>CHOOSE END FROM RELATION STOPS:</b></td>        
    <td>Or from stops in DB:</td>
            </tr>
            <tr>
                <th >ID</th>
                <th >Name</th>  
                <td>${toStopsMenu}</td>
            </tr></thead>
            ${toStopsRows}
        </table>
    </td></tr>
</table>
`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    showChooseDBStopsForm: function (fromStopsMenu, toStopsMenu) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `
<table>
    <tr style='vertical-align: top'><td> 
        <table > 
            <tr>
            <td><b>CHOOSE START from stops in DB:</b></td>   
            </tr>
            <tr><td>${fromStopsMenu}</td></tr>
        </table> 
    </td>   
    <td>
        <table >
            <tr>
            <td ><b>CHOOSE END from stops in DB:</b></td>     
            </tr>
            <tr><td>${toStopsMenu}</td></tr>
        </table>
    </td></tr>
<tr><td colspan='2'>If stops not present in DB, first create them using the option <a href='./constructstop.html' target='_blank'>'Get Stop from OSM or Create new Stop' and then refresh stops menu</a>...</td></tr>
</table>
`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    searchLegForm: function () {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `
<form id="searchForm" name="searchForm">
<table>
<tr><td colspan="6">Search for records that: 
  <select name="and_or" id="and_or" onChange="changePGRESTWhere(['id', 'name', 'stopfrom', 'stopto', 'notes', 'startdatetime', 'enddatetime','type'])">
    <option value="and" selected >comply to all search criteria (logical AND)</option>
    <option value="or" >comply to at least one of the search criteria (logical OR)</option>
  </select>  Leave empty fields not used as search criteria... 
  <button class="bigbutton" type="reset"  name="reset" id="reset">Clear Form</button>
  <input class="bigbutton" type="button" onclick="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type']);searchLegs(theWhereStr)" value="START SEARCH" />
</td></tr>
        <tr>
            <td class="colname">ID:
            </td>
            <td>
                <select name="op_id" id="op_id" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])">
                    <option value="=" selected>=</option>
                    <option value="<" >&lt;</option>
                    <option value=">">&gt;</option>
                    <option value="<>">&ne;</option>
                </select>
            </td>
            <td>
                <input id="col_id" name="id" type="number" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])"> 
            </td>
            <td class="colname">Name:
            </>
            <td>
                <select name="op_name" id="op_name" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])">
                    <option value="contains" selected>contains</option>
                    <option value="equals">equals</option>
                    <option value="beginswith">begins with</option>
                    <option value="endswith">ends with</option>
                </select>
            </td>
            <td>
                <input id="col_name" name="name" type="text" size="40" maxLength="255" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])">  
            </td>
        </tr>
        <tr>
            <td class="colname">From (id):
            </td>
            <td>
                <select name="op_stopfrom" id="op_stopfrom" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])">
                    <option value="=" selected>=</option>
                </select>
            </td>
            <td>
                <input id="col_stopfrom" name="from" type="number" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])"> 
            </td>
            <td class="colname">To (id):
            </td>
            <td>
                <select name="op_stopto" id="op_stopto" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])">
                    <option value="=" selected>=</option>
                </select>
            </td>
            <td>
                <input id="col_stopto" name="stopto" type="number" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])"> 
            </td>
        </tr>
        <tr>
            <td class="colname">Start:
            </td> 
            <td>
                <select name="op_startdatetime" id="op_startdatetime" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])">
                <option value="=" >at</option>
                <option value="<" >before</option>
                <option value=">" selected>after</option>
                </select>
            </td>
            <td>
                <input id="col_startdatetime" name="startdatetime" type="text" size="25" maxLength="64" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])">
            </td>
            <td class="colname">End:
            </td>
            <td>
                <select name="op_enddatetime" id="op_enddatetime" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])">
                <option value="=" >at</option>
                <option value="<" selected>before</option>
                <option value=">">after</option>
                </select>
            </td>
            <td>
                <input id="col_enddatetime" name="enddatetime" type="text" size="25" maxLength="64" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])">
                 YYYY-MM-DDThh:mm 
            </td>
        </tr>   
        <tr>
            <td class="colname">Type: </td>
            <td >
                <select name="op_type" id="op_type" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])">
                    <option value="=" selected>=</option>
                </select>
            </td>
            <td>
                <input id="col_type" name="type" type="text" size="25" maxLength="255" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])"> 
            </td>
            <td class="colname">Notes: </td>
            <td >
                <select name="op_notes" id="op_notes" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])">
                    <option value="contains" selected>contains</option>
                    <option value="equals">equals</option>
                    <option value="beginswith">begins with</option>
                    <option value="endswith">ends with</option>
                </select>
            </td>
            <td colspan="2">
                <input id="col_notes" name="notes" type="text" size="80" maxLength="255" onChange="changePGRESTWhere(['id','name','stopfrom','stopto','notes','startdatetime','enddatetime','type'])"> 
            </td>
        </tr>
</table>
    </form>
    `; // do NOT forget closing `; !!
    },
//+++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    searchOSMrelationIDForm: function () {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `

<form id="searchOSMrelationIDForm" name="searchOSMrelationIDForm">
<table>
    <tr>
     <td>OSMrelationID:</td><td><input id="osm_id"  type="number" /></td>
     <td><input id="premerge"  type="checkbox" checked/></td><td>Try automatic pre-merge</td>
     <td><input class="bigbutton" id="relationIdBtn" type="button" value="SHOW" /></td>
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
<table>
<tr><td colspan="6">Search for records that: 
  <select name="and_or" id="and_or" onChange="changePGRESTWhere(['id','name'])">
    <option value="and" selected >comply to all search criteria (logical AND)</option>
    <option value="or" >comply to at least one of the search criteria (logical OR)</option>
  </select>  Leave empty fields not used as search criteria... 
  <button class="bigbutton" type="reset"  name="reset" id="reset">Clear Form</button>
  <input class="bigbutton" type="button" onclick="changePGRESTWhere(['id','name']);searchStops(theWhereStr)" value="START SEARCH" />
</td></tr>
        <tr>
            <td class="colname">ID:
            </td>
            <td>
                <select name="op_id" id="op_id" onChange="changePGRESTWhere(['id','name'])">
                    <option value="=" selected>=</option>
                    <option value="<" >&lt;</option>
                    <option value=">">&gt;</option>
                    <option value="<>">&ne;</option>
                </select>
            </td>
            <td>
                <input id="col_id" name="id" type="number" onChange="changePGRESTWhere(['id','name'])"> 
            </td>
            <td class="colname">Name:
            </>
            <td>
                <select name="op_name" id="op_name" onChange="changePGRESTWhere(['id','name'])">
                    <option value="contains" selected>contains</option>
                    <option value="equals">equals</option>
                    <option value="beginswith">begins with</option>
                    <option value="endswith">ends with</option>
                </select>
            </td>
            <td>
                <input id="col_name" name="name" type="text" size="40" maxLength="255" onChange="changePGRESTWhere(['id','name'])">  
            </td>
        </tr>
</table>
    </form>
    `; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    saveLegForm: function (theLeg) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        //
        // do NOT forget opening ` !
        return `
<table>
        <tbody>
        <tr class="plain">
            <td class="colname">ID:
            </td>
            <td>
                UID [will be created by DB]
            </td>
            <td><button id="SaveBtn" class="bigbutton">SAVE in DB</button> </td>
        </tr>
        <tr class="plain">
            <td class="colname">Name:
            </td>
            <td>
                <input id="leg_name" name="name" type="text" size="80" maxLength="255" 
                value="${theLeg.stopFrom.name} – ${theLeg.stopTo.name}"> 
            </td>
            <td><button id="CancelBtn" class="bigbutton">Cancel</button> </td>
        </tr>
        <tr class="plain">
            <td class="colname">From:
            </td>
            <td>
                ${theLeg.stopFrom.name} [${theLeg.stopFrom.id}] 
                <span class="colname">To: 
                ${theLeg.stopTo.name} [${theLeg.stopTo.id}]
            </td>
        </tr>
        <tr class="plain">
            <td  class="colname">Notes: </td>
            <td>
                <textarea cols="75" rows="3" id="leg_notes" name="notes" wrap="soft">${theLeg.notes}</textarea> 
            </td>
        </tr>
        <tr class="plain">
            <td class="colname">Type:
            </td>
            <td>
                ${legTypesMenu}
            </td>
        </tr>
        <tr class="plain">
            <td class="colname">Start:
            </td>
            <td>
                <input id="leg_startdatetime" name="startdatetime" type="text" size="25" maxLength="64" value="${theLeg.startDateTime}" >
                <span class="colname"> End: 
                <input id="leg_enddatetime" name="enddatetime" type="text" size="25" maxLength="64" value="${theLeg.endDateTime}" >
                 YYYY-MM-DDThh:mm  (if unknown, set time T00:00)
            </td>
        </tr>      
        <tr class="plain">
            <td  class="colname">Geometry:</td>
            <td>
                <a onClick="alert('Cannot edit JSON textually. Use  map interface to create from OSM...')">[JSON]</a>
            </td>
        </tr>
        </tbody></table>
`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    saveStopForm: function (theStop) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `
<table>
        <tbody>
        <tr class="plain">
            <td class="colname">ID:
            </td>
            <td>
                <input id="stop_id" name="id" type="number" value="${theStop.id}"> 
            </td>
            <td><button id="SaveBtn" class="bigbutton">SAVE in DB</button> </td>
        </tr>
        <tr class="plain">
            <td class="colname">Name:</td>
            <td>
                <input id="stop_name" name="name" type="text" size="40" maxLength="255" 
                value="${theStop.name}"> 
            </td>
            <td><button id="CancelBtn" class="bigbutton">Cancel</button> </td>
        </tr>
        </tbody></table>
`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    editLegForm: function (theLeg) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `
<table>
        <tbody>
        <tr class="plain">
            <td class="colname">ID:
            </td>
            <td>
                ${theLeg.id} (UID, cannot change)
            </td>
            <td><button id="SaveBtn" class="bigbutton">SAVE CHANGES</button> </td>
        </tr>
        <tr class="plain">
            <td class="colname">Name:
            </td>
            <td>
                <input id="leg_name" name="name" type="text" size="80" maxLength="255" 
                value="${theLeg.name}"> 
            </td>
            <td><button id="CancelBtn" class="bigbutton">Cancel</button> </td>
        </tr>
        <tr class="plain">
            <td class="colname">From:
            </td>
            <td>
                ${theLeg.stopFrom.name} [${theLeg.stopFrom.id}] 
                <span class="colname">To: 
                ${theLeg.stopTo.name} [${theLeg.stopTo.id}] (cannot edit, linked to geometry)
            </td>
        </tr>
        <tr class="plain">
            <td class="colname">Type:
            </td>
            <td>
                ${legTypesMenu}
            </td>
        </tr>
        <tr class="plain">
            <td  class="colname">Notes: </td>
            <td>
                <textarea cols="75" rows="3" id="leg_notes" name="notes" wrap="soft">${theLeg.notes}</textarea> 
            </td>
        </tr>
        <tr class="plain">
            <td class="colname">Start:
            </td>
            <td>
                <input id="leg_startdatetime" name="startdatetime" type="text" size="25" 
                maxLength="64" value="${theLeg.startDateTime}" >
                <span class="colname"> End: 
                <input id="leg_enddatetime" name="enddatetime" type="text" size="25" 
                maxLength="64" value="${theLeg.endDateTime}" >
                 YYYY-MM-DDThh:mm  (if unknown, set time T00:00)
            </td>
        </tr>      
        <tr class="plain">
            <td  class="colname">Geometry:</td>
            <td>
                <a onClick="alert('Cannot edit JSON')">[JSON]</a>
            </td>
        </tr>
        </tbody></table>
`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    editStopForm: function (theStop) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `
<table><tbody>
    <tr class="plain">
        <td class="colname">ID:
        </td>
        <td>
           ${theStop.id} (link with Legs, cannot change)
        </td>
        <td><button id="SaveBtn" class="bigbutton">SAVE CHANGES</button> </td>
    </tr>
    <tr class="plain">
        <td class="colname">Name:
        </td>
        <td>
            <input id="stop_name" name="name" type="text" size="40" maxLength="255" 
            value="${theStop.name}"> 
        </td>
        <td><button id="CancelBtn" class="bigbutton">Cancel</button> </td>
    </tr>      
</tbody></table>

`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,

//+++++++++++++++++++++++++++++++++++++++++++++++++++
    showLegRow: function (theLeg) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening \` !
        return `
<tr>
	<td>${theLeg.id}</td>
	<td>${theLeg.name}</td>
	<td>${theLeg.stopFrom.name}</td>
	<td>${theLeg.stopTo.name}</td>
	<td>${(theLeg.startDateTime === '' || theLeg.startDateTime === 'null') ? '-' : HTML.formatDateTime(theLeg.startDateTime)}</td>
	<td>${(theLeg.endDateTime === '' || theLeg.endDateTime === 'null') ? '-' : HTML.formatDateTime(theLeg.endDateTime)}</td>
	<td>${legTypes[theLeg.type]}</td>
	<td>${HTML.replaceBR(theLeg.notes)}</td>
	<td><input type="checkbox" id="select_${theLeg.id}" onchange="toggleSelect(${theLeg.id})" ${theLeg.selected ? 'checked' : ''} /></td>
	<td><input type="button" id="edit_${theLeg.id}" onclick="editLeg(${theLeg.id},'workflow')" value="EDIT" /></td>
	<td><input type="button" id="del_${theLeg.id}" onclick="delLeg(${theLeg.id})" value="DEL" /></td>

</tr>
`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    showEditStopRow: function (theStop) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening \` !
        return `
<tr>
	<td>${theStop.id}</td>
	<td>${theStop.name}</td>
	<td><input type="checkbox" id="select_${theStop.id}" onchange="toggleSelect(${theStop.id})" ${theStop.selected ? 'checked' : ''} /></td>
	<td><input type="button" id="edit_${theStop.id}" onclick="editStop(${theStop.id},'workflow')" value="EDIT" /></td>
	<td><input type="button" id="del_${theStop.id}" onclick="delStop(${theStop.id})" value="DEL" /></td>

</tr>
`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    showStopRow: function (theStop) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening \` !
        return `
<tr>
	<td>${theStop.id}</td>
	<td>${theStop.name}</td>
	<td><input type="checkbox" id="select_${theStop.id}" onchange="toggleSelect(${theStop.id})" ${theStop.selected ? 'checked' : ''} /></td>
	<td></td>
	<td></td>

</tr>
`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++

} //end TMPL object