/**
 * HTMLTemplates.js:
 * HTML templates for forms, tables, etc. using JS templating
 * @author Barend Kobben - b.j.kobben@utwente.nl
 * @version 1.0 [Aug 2021]
 *
 */

TMPL = {

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
    saveLegForm: function (theLeg) {
//+++++++++++++++++++++++++++++++++++++++++++++++++++
        // do NOT forget opening ` !
        return  `
<table>
        <tbody>
        <tr class="plain">
            <td   class="colname">Name:</span>
            </td>
            <td>
                <input id="leg_name" name="name" type="text" size="80" maxLength="255" 
                value="${theLeg.stopFrom.name}–${theLeg.stopTo.name}"> 
            </td>
        </tr>
        <tr class="plain">
            <td   class="colname">From:
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
            <td   class="colname">Start:
            </td>
            <td>
                <input id="leg_startdatetime" name="startdatetime" type="datetime-local" size="25" maxLength="64" value="" >
                <span class="colname"> End: </span>
                <input id="leg_enddatetime" name="enddatetime" type="datetime-local" size="25" maxLength="64" value="" >
                 DD-MM-YYYY hh:mm  (set hh:mm to 00:00 if unknown)
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
            <td   class="colname">Name:</span>
            </td>
            <td>
                <input id="leg_name" name="name" type="text" size="80" maxLength="255" 
                value="${theLeg.name}"> 
            </td>
        </tr>
        <tr class="plain">
            <td   class="colname">From:
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
            <td   class="colname">Start:
            </td>
            <td>
                <input id="leg_startdatetime" name="startdatetime" type="datetime-local" size="25" maxLength="64" value="" >
                <span class="colname"> End: </span>
                <input id="leg_enddatetime" name="enddatetime" type="datetime-local" size="25" maxLength="64" value="" >
                 DD-MM-YYYY hh:mm  (set hh:mm to 00:00 if unknown)
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
	<td>${TMPL.formatDateTime(theLeg.startDateTime)}</td>
	<td>${TMPL.formatDateTime(theLeg.endDateTime)}</td>
	<td>${theLeg.notes.replace("\n", "<br>")}</td>
	<td><input type="checkbox" id="select_${theLeg.id}" onchange="toggleSelect(${theLeg.id})" ${theLeg.selected?'checked':''} /></td>
	<td><input type="button" id="edit_${theLeg.id}" onclick="editLeg(${theLeg.id})" value="EDIT" /></td>
	<td><input type="button" id="del_${theLeg.id}" onclick="delLeg(${theLeg.id})" value="DEL" /></td>

</tr>
`; // do NOT forget closing `; !!
    }
//+++++++++++++++++++++++++++++++++++++++++++++++++++

} //end TMPL object