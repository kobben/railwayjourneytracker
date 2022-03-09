/**
 * UI.js:
 *
 * User interface & messaging system
 * used for messages as well as errors and debug info
 * and for tooltips
 *
 * Licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 3.0 License.
 * see http://creativecommons.org/licenses/by-nc-sa/3.0/
 *
 * @author Barend Kobben - b.j.kobben@utwente.nl
 * @version 1.0 [December 2021]
 *
 */

//GLOBAL:
const errorMsg = 0;
const showMsg = 1;
const hideMsg = 2;
const dataMsg = 3;
const workflowMsg = 4;

let UI = {

    showHover: true
    ,

    resetActionBtns: function () {
        let placeholder = document.getElementById("UI_Buttons");
        let btnsHTML = "<input type='button' class='bigbutton' id='action6Btn' value='ACTION6' style='display: none'/>";
        btnsHTML += "<input type='button' class='bigbutton' id='action5Btn' value='ACTION5' style='display: none'/>";
        btnsHTML += "<input type='button' class='bigbutton' id='action4Btn' value='ACTION4' style='display: none' />";
        btnsHTML += "<input type='button' class='bigbutton' id='action3Btn' value='ACTION3' style='display: none' />";
        btnsHTML += "<input type='button' class='bigbutton' id='action2Btn' value='ACTION2' style='display: none' />";
        btnsHTML += "<input type='button' class='bigbutton' id='action1Btn' value='ACTION1' style='display: none' />";
        placeholder.innerHTML = btnsHTML;
    }
    ,

    InitMessages: function (debugOn) {
        UI.showDebugMessages = debugOn;
        // UI.appDiv = document.getElementsByTagName("body")[0];
        UI.appDiv = document.getElementById("mapDiv");
        //create tooltip divs:
        UI.tooltipDiv = UI.appDiv.appendChild(document.createElement("div"));
        UI.tooltipDiv.setAttribute("class", "tooltip");
        UI.tooltipDiv.style.visibility = "hidden";
        UI.tooltipText = UI.tooltipDiv.appendChild(document.createElement("div"));
        UI.tooltipText.setAttribute("class", "tooltip-text");
    }
    ,

    SetMessage: function (messageStr, messageType, messageXY) {
        //first some checking and if necessary repairing:
        if (messageStr === undefined) { //no message:
            messageStr = "*empty msg*";
        }
        if (messageType === showMsg) { //log message and display message box
            const cx = (UI.appDiv.clientWidth / 2) + UI.appDiv.offsetLeft - 24;
            const cy = (UI.appDiv.clientHeight / 2) + UI.appDiv.offsetTop - 12;
            toolTipMove([cx, cy]);
            toolTipShow(messageStr);
        } else if (messageType === hideMsg) { //log message and hide messagebox
            toolTipHide(messageStr);
        } else if (messageType === errorMsg) { //Error: display Javascript alert
            alert(messageStr);
        } else if (messageType === dataMsg) { //data formatted in html
            toolTipMove(messageXY);
            toolTipShow(messageStr);
        } else if (messageType === workflowMsg) { //show in workflowMessages;
            let EL = document.getElementById("wfmsg");
            EL.innerHTML = messageStr;
            // const cx = (UI.appDiv.clientWidth / 2) + UI.appDiv.offsetLeft - 24;
            // const cy = (UI.appDiv.clientHeight / 2) + UI.appDiv.offsetTop - 12;
            // toolTipMove([cx, cy]);
            // toolTipShow(messageStr);
        }
        if (UI.showDebugMessages && messageType !== dataMsg) {
            // if debugOn, all messageTypes except dataMSg are also logged in console;
            console.log(messageStr);
        }
    }
}

function toolTipMove(pixel) { // d contains data with x & y
    UI.tooltipDiv.style.left = (pixel[0] + 7) + "px";
    UI.tooltipDiv.style.top = (pixel[1] + 12) + "px";
}

function toolTipHide() {
    UI.tooltipDiv.style.visibility = "hidden";
}

function toolTipShow(theText) {
    UI.tooltipDiv.style.visibility = "visible";
    UI.tooltipText.innerHTML = theText;
}