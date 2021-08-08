/**
 * HTML.js:
 * HTML templates for forms, tables, etc. using JS templating
 * @author Barend Kobben - b.j.kobben@utwente.nl
 * @version 1.0 [Aug 2021]
 *
 */

HTML = {

//+++++++++++++++++++++++++++++++++++++++++++++++++++
    formatDateTime: function (DTS) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        let theStr = '';
        if (DTS === null || DTS === undefined) {
            return '–';
        } else {
            let DT = new Date(DTS);
            let HH = DT.getHours(); let MM = DT.getMinutes();
            let options = { year: '2-digit', month: 'short', day: 'numeric' };
            theStr += DT.toLocaleString("en-UK",options);
            if (HH === 0 && MM === 0) {
                return theStr;
            } else {
                theStr += ' ' + HH + ':' + ((MM<10)?'0'+MM:MM);
                return theStr;
            }
        }
    }
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    showStopsTable: function (fromStopsHtml, toStopsHtml) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return `
<table>
    <tr style='vertical-align: top'><td> 
        <table> 
            <tr><td colspan='2'><b>CHOOSE LEG START HERE:</b></td></tr>
            <tr>
                <th class='selector'>ID</th>
                <th class='selector'>Name</th>
            </tr>
            ${fromStopsHtml}
        </table> 
    </td><td><b>&nbsp=>&nbsp</b></td><td>
        <table>
            <tr>
            <td colspan='2'><b>CHOOSE LEG END HERE:</b></td>
            </tr>
            <tr>
                <th class='selector'>ID</th>
                <th class='selector'>Name</th>
            </tr>
            ${toStopsHtml}
        </table>
    </td></tr>
</table>
`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    ,
//+++++++++++++++++++++++++++++++++++++++++++++++++++
    searchLegForm: function () {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return  `
<form id="searchForm" name="searchForm">
<table>
<tr><td colspan="6">Search for records that: 
  <select name="and_or" id="and_or" onChange="changeWhere()">
    <option value="and" selected >comply to all search criteria (logical AND)</option>
    <option value="or" >comply to at least one of the search criteria (logical OR)</option>
  </select>  Leave empty fields not used as search criteria... 
  <button class="bigbutton" type="reset"  name="reset" id="reset">Clear Form</button>
  <input class="bigbutton" type="button" onclick="changeWhere();searchLegs(theWhereStr)" value="START SEARCH" />
</td></tr>
        <tr>
            <td class="colname">ID:</span>
            </td>
            <td>
                <select name="op_id" id="op_id" onChange="changeWhere()">
                    <option value="=" selected>=</option>
                    <option value="<" >&lt;</option>
                    <option value=">">&gt;</option>
                    <option value="<>">&ne;</option>
                </select>
            </td>
            <td>
                <input id="col_id" name="id" type="number" onChange="changeWhere()"> 
            </td>
            <td class="colname">Name:</span>
            </>
            <td>
                <select name="op_name" id="op_name" onChange="changeWhere()">
                    <option value="contains" selected>contains</option>
                    <option value="equals">equals</option>
                    <option value="beginswith">begins with</option>
                    <option value="endswith">ends with</option>
                </select>
            </td>
            <td>
                <input id="col_name" name="name" type="text" size="40" maxLength="255" onChange="changeWhere()">  
            </td>
        </tr>
        <tr>
            <td class="colname">From (id):
            </td>
            <td>
                <select name="op_stopfrom" id="op_stopfrom" onChange="changeWhere()">
                    <option value="=" selected>=</option>
                </select>
            </td>
            <td>
                <input id="col_stopfrom" name="from" type="number" onChange="changeWhere()"> 
            </td>
            <td class="colname">To (id):
            </td>
            <td>
                <select name="op_stopto" id="op_stopto" onChange="changeWhere()">
                    <option value="=" selected>=</option>
                </select>
            </td>
            <td>
                <input id="col_stopto" name="stopto" type="number" onChange="changeWhere()"> 
            </td>
        </tr>
        <tr>
            <td class="colname">Start:
            </td> 
            <td>
                <select name="op_startdatetime" id="op_startdatetime" onChange="changeWhere()">
                <option value="=" >at</option>
                <option value="<" selected>before</option>
                <option value=">">after</option>
                </select>
            </td>
            <td>
                <input id="col_startdatetime" name="startdatetime" type="text" size="25" maxLength="64" onChange="changeWhere()">
            </td>
            <td class="colname">End:
            </td>
            <td>
                <select name="op_enddatetime" id="op_enddatetime" onChange="changeWhere()">
                <option value="=" >at</option>
                <option value="<" selected>before</option>
                <option value=">">after</option>
                </select>
            </td>
            <td>
                <input id="col_enddatetime" name="enddatetime" type="text" size="25" maxLength="64" onChange="changeWhere()">
                 YYYY-MM-DDThh:mm 
            </td>
        </tr>   
        <tr>
            <td class="colname">Notes: </td>
            <td >
                <select name="op_notes" id="op_notes" onChange="changeWhere()">
                    <option value="contains" selected>contains</option>
                    <option value="equals">equals</option>
                    <option value="beginswith">begins with</option>
                    <option value="endswith">ends with</option>
                </select>
            </td>
            <td colspan="4">
                <input id="col_notes" name="notes" type="text" size="80" maxLength="255" onChange="changeWhere()"> 
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
        // do NOT forget opening ` !
        return  `
<table>
        <tbody>
        <tr class="plain">
            <td class="colname">Name:</span>
            </td>
            <td>
                <input id="leg_name" name="name" type="text" size="80" maxLength="255" 
                value="${theLeg.stopFrom.name}–${theLeg.stopTo.name}"> 
            </td>
        </tr>
        <tr class="plain">
            <td class="colname">From:
            </td>
            <td>
                ${theLeg.stopFrom.name} [${theLeg.stopFrom.id}] 
                <span class="colname">To: </span>
                ${theLeg.stopTo.name} [${theLeg.stopTo.id}]
            </td>
        </tr>
        <tr class="plain">
            <td  class="colname">Notes: </td>
            <td>
                <textarea cols="75" rows="3" id="leg_notes" name="notes" wrap="soft"></textarea> 
            </td>
        </tr>
        <tr class="plain">
            <td class="colname">Start:
            </td>
            <td>
                <input id="leg_startdatetime" name="startdatetime" type="text" size="25" maxLength="64" value="" >
                <span class="colname"> End: </span>
                <input id="leg_enddatetime" name="enddatetime" type="text" size="25" maxLength="64" value="" >
                 YYYY-MM-DDThh:mm  (if unknown, set time T00:00)
            </td>
        </tr>      
        <tr class="plain">
            <td  class="colname">Geometry:</td>
            <td>
                <a onClick="alert('Cannot edit JSON textually. Use  map interface to create from OSM...')">[JSON]</a>
                <span class="colname">Derived from OSM relation: </span>
                ${theLeg.OSMrelationName} [${theLeg.OSMrelationID}]
            </td>
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
        return  `
<table>
        <tbody>
        <tr class="plain">
            <td class="colname">ID:</span>
            </td>
            <td>
                ${theLeg.id}
            </td>
        </tr>
        <tr class="plain">
            <td class="colname">Name:</span>
            </td>
            <td>
                <input id="leg_name" name="name" type="text" size="80" maxLength="255" 
                value="${theLeg.name}"> 
            </td>
        </tr>
        <tr class="plain">
            <td class="colname">From:
            </td>
            <td>
                ${theLeg.stopFrom.name} [${theLeg.stopFrom.id}] 
                <span class="colname">To: </span>
                ${theLeg.stopTo.name} [${theLeg.stopTo.id}] (cannot edit, linked to geometry)
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
                <span class="colname"> End: </span>
                <input id="leg_enddatetime" name="enddatetime" type="text" size="25" 
                maxLength="64" value="${theLeg.endDateTime}" >
                 YYYY-MM-DDThh:mm  (if unknown, set time T00:00)
            </td>
        </tr>      
        <tr class="plain">
            <td  class="colname">Geometry:</td>
            <td>
                <a onClick="alert('Cannot edit JSON textually. Use  map interface to create from OSM...')">[JSON]</a>
                <span class="colname">Derived from OSM relation: </span>
                ${theLeg.OSMrelationName} [${theLeg.OSMrelationID}] (cannot edit, linked to geometry)
            </td>
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
	<td>${HTML.formatDateTime(theLeg.startDateTime)}</td>
	<td>${HTML.formatDateTime(theLeg.endDateTime)}</td>
	<td>${theLeg.notes.replace("\n", "<br>")}</td>
	<td><input type="checkbox" id="select_${theLeg.id}" onchange="toggleSelect(${theLeg.id})" ${theLeg.selected ? 'checked' : ''} /></td>
	<td><input type="button" id="edit_${theLeg.id}" onclick="editLeg(${theLeg.id},'workflow')" value="EDIT" /></td>
	<td><input type="button" id="del_${theLeg.id}" onclick="delLeg(${theLeg.id})" value="DEL" /></td>

</tr>
`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++

} //end TMPL object