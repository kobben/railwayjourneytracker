/**
 * Messages.js:
 *
 * messaging system used for messages as well as errors and debug info
 * and for tooltips -- THIS VERSION non-D3 dependent!
 *
 * Licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 3.0 License.
 * see http://creativecommons.org/licenses/by-nc-sa/3.0/
 *
 * @author Barend Kobben - b.j.kobben@utwente.nl
 * @version 1.3 [November 2020]
 *
 */
//GLOBAL:






const errorMsg = 0; const showMsg = 1;
const hideMsg = 2; const dataMsg = 3; const workflowMsg = 4;
let showDebugMessages, toolTipDiv, tooltipText, appDiv;

function InitMessages(appDivId, debugOn) {
  showDebugMessages = debugOn;
  appDiv = document.getElementById(appDivId);
  //create tooltip divs:
  tooltipDiv = document.getElementsByTagName("body")[0].appendChild(document.createElement("div"));
  tooltipDiv.setAttribute("class", "tooltip");
  tooltipDiv.style.visibility = "hidden";
  tooltipText = tooltipDiv.appendChild(document.createElement("div"));
  tooltipText.setAttribute("class", "tooltip-text");
}


function SetMessage(messageStr, messageType, messageXY) {
  //first some checking and if necessary repairing:
  if (messageStr === undefined) { //no message:
    messageStr = "<empty msg>";
  }
  if (messageType === showMsg) { //log message and display message box
    toolTipMove(getCenterOf(appDiv));
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
    EL.innerText = messageStr;
  }
  if (showDebugMessages) { // if debugOn, all messageTypes are also logged in console;
    console.log(messageStr);
  }
}

function getCenterOf(htmlElem) {
  // approx in center of application div:
  const cx = (htmlElem.clientWidth / 2) + htmlElem.offsetLeft - 24;
  const cy = (htmlElem.clientHeight / 2) + htmlElem.offsetTop - 12;
  return [cx,cy];
}

function toolTipMove(pixel) { // d contains data with x & y
  tooltipDiv.style.left = (pixel[0] + 7) + "px";
  tooltipDiv.style.top = (pixel[1] + 12) + "px";
}

function toolTipHide() {
  tooltipDiv.style.visibility = "hidden";
}

function toolTipShow(theText) {
  tooltipDiv.style.visibility = "visible";
  tooltipText.innerHTML = theText;
}