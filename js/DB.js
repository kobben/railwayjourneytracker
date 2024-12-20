/**
 * CLASS DB:
 *
 * Functionality to access a Postgres DB through REST
 * Uses the Postgrest-client.js and  assumes PostgREST running on port 3000
 *
 * Licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 3.0 License.
 * see http://creativecommons.org/licenses/by-nc-sa/3.0/
 *
 * @author Barend Kobben - b.j.kobben@utwente.nl
 *
 */

DB = {

//DB GLOBALS:
    PGapi: null,
    authToken: null,

    init: function (url, token) {
        try {
            this.PGapi = new PostgREST(url);
            this.authToken = token;
            return true;
        } catch (error) {
            console.log(error);
            return false;
        }
    }
    ,
    giveErrorMsg: function (resultJSON) {
        let errStr = '';
        if (resultJSON.data.message != null) errStr += "\n" + resultJSON.data.message;
        if (resultJSON.data.code != null) errStr += " [" + resultJSON.data.code + "].";
        if (resultJSON.data.details != null) errStr += "\n" + resultJSON.data.details;
        if (resultJSON.data.hint != null) errStr += "\n" + resultJSON.data.hint;
        if (errStr === '') errStr = "\n" + resultJSON.data;
        UI.SetMessage("ERROR in DB module: " + errStr, errorMsg);
    }
    ,
    // if no Where supplied get ALL journeys that ALL legs are in
    loadLegsInJourneysFromDB: async function (theWhereStr = '') {
        let postUrl = '/journeys?select=id,legsarray&' + theWhereStr;
        // console.log(postUrl);
        let resultJSON = await DB.query("GET", postUrl);
        if (resultJSON.error === true) {
            DB.giveErrorMsg(resultJSON);
        } else {
            return resultJSON.data;
        }
    }
    ,
    loadTypesFromDB: async function (typesTable) {
        let typesFound = [];
        let postUrl = '/' + typesTable + '?select=id,name&order=id&';
        let resultJSON = await this.query("GET", postUrl);
        if (resultJSON.error === true) {
            this.giveErrorMsg(resultJSON);
        } else {
            for (let typeFound of resultJSON.data) {
                typesFound.push(typeFound);
            }
            UI.SetMessage(typesFound.length + " types loaded from DB table '" + typesTable + "'.", workflowMsg);
            return typesFound;
        }
    }
    ,
    addStopIfNew: async function (theStop) {
        let postUrl = '/stops' + '?&id=eq.' + parseInt(theStop.id);
        let resultJSON = await this.query("GET", postUrl);
        if (resultJSON.error === true) {
            this.giveErrorMsg(resultJSON);
            return false;
        } else {
            if (resultJSON.data.length === 0) { // no items found
                let stopAdded = await DB.addStop(theStop.id, theStop.name, theStop.geometry);
                if (stopAdded) {
                    UI.SetMessage("Created stop " + theStop.name + " [" + theStop.id + "]", workflowMsg);
                    return true;
                }
            } else {
                UI.SetMessage("Using exisiting stop " + theStop.name + " [" + theStop.id + "]", workflowMsg);
                return false;
            }
        }
    }
    ,
    addStop: async function (id, name, geojson) {
        try {
            let postUrl = '/stops';
            let geojsonStr = JSON.stringify(geojson, null, 0);
            let postObjStr = `{ "id": ${id}, "name": "${name}", "geojson": ${geojsonStr} }`;
            let postObj = JSON.parse(postObjStr);
            // console.log(postObj);
            let resultJSON = await this.query("POST", postUrl, postObj);
            if (resultJSON.error === true) {
                this.giveErrorMsg(resultJSON);
                return false;
            } else {
                return true;
            }
        } catch (e) {
            UI.SetMessage("ERROR in AddStop function in DB module:\n " +  + e
                + '\npostURl  = ' + postObjStr,errorMsg );
        }
    }
    ,
    deleteLeg: async function (ID) {
        try {
            let postUrl = '/legs?id=eq.' + ID;
            let resultJSON = await this.query("DELETE", postUrl);
            if (resultJSON.error === true) {
                this.giveErrorMsg(resultJSON);
                return false;
            } else {
                return true;
            }
        } catch (e) {
            UI.SetMessage("ERROR in deleteLeg function in DB module:\n " +  + e
                + '\npostURl  = ' + postObjStr,errorMsg );
        }
    }
    ,
    deleteJourney: async function (ID) {
        try {
            let postUrl = '/journeys?id=eq.' + ID;
            let resultJSON = await this.query("DELETE", postUrl);
            if (resultJSON.error === true) {
                this.giveErrorMsg(resultJSON);
                return false;
            } else {
                return true;
            }
        } catch (e) {
            UI.SetMessage("ERROR in deleteJourney function in DB module:\n " +  + e
                + '\npostURl  = ' + postObjStr,errorMsg );
        }
    }
    ,
    deleteStop: async function (ID) {
        try {
            let postUrl = '/stops?id=eq.' + ID;
            let resultJSON = await this.query("DELETE", postUrl);
            if (resultJSON.error === true) {
                this.giveErrorMsg(resultJSON);
                return false;
            } else {
                return true;
            }
        } catch (e) {
            UI.SetMessage("Unexpected ERROR in delStop function in DB module:\n " +  + e
                + '\npostURl  = ' + postObjStr,errorMsg );
        }
    }
    ,
    addLeg: async function (theLeg) {
        let postObjStr = '';
        try {
            let postUrl = '/legs';
            let geojsonStr = JSON.stringify(theLeg.geometry, null, 0);
            postObjStr = `{ "notes": "${theLeg.notes}", "type": "${theLeg.type}", "startdatetime": "${theLeg.startDateTime}", "enddatetime": "${theLeg.endDateTime}", "stopfrom": ${theLeg.stopFrom.id}, "stopto": ${theLeg.stopTo.id}, "geojson": ${geojsonStr}  }`;
            let postObj = JSON.parse(postObjStr);
            if (theLeg.startDateTime === '') {
                postObj.startdatetime = null;
            }
            if (theLeg.endDateTime === '') {
                postObj.enddatetime = null;
            }
            let resultJSON = await this.query("POST", postUrl, postObj);
            if (resultJSON.error === true) {
                this.giveErrorMsg(resultJSON);
                return false;
            } else {
                return true;
            }
        } catch (e) {
            UI.SetMessage("ERROR in Addleg function in DB module:\n " + e
                + '\npostURl  = ' + postObjStr,errorMsg );
        }
    }
    ,
    addJourney: async function (theJourney) {
        let postObjStr = '';
        try {
            let postUrl = '/journeys';
            postObjStr = `{ "notes": "${theJourney.notes}", "type": "${theJourney.type}", "startdatetime": 
                "${theJourney.startDateTime}", "enddatetime": "${theJourney.endDateTime}", "stopfrom": ${theJourney.stopFrom.id}, 
                "stopto": ${theJourney.stopTo.id}, "legsarray": "{${theJourney.legsIDArray}}" }`;
            let postObj = JSON.parse(postObjStr);
            console.log(postObjStr);
            // console.log(postObj);
            let resultJSON = await this.query("POST", postUrl, postObj);
            if (resultJSON.error === true) {
                this.giveErrorMsg(resultJSON);
                return false;
            } else {
                return true;
            }
        } catch (e) {
            UI.SetMessage("ERROR in addJourney function in DB module:\n "  + e
                + '\npostURl  = ' + postObjStr, errorMsg );
        }
    }
    ,
    patchLeg: async function (theLeg, ID) {
        let postObjStr='';
        try {
            let whereStr = '?id=eq.' + ID;
            let postUrl = '/legs' + whereStr;
            let geojsonStr = JSON.stringify(theLeg.geometry, null, 0);
            postObjStr = `{ "notes": "${theLeg.notes}", "type": "${theLeg.type}", "startdatetime": "${theLeg.startDateTime}", "enddatetime": "${theLeg.endDateTime}", "timesequential": "${theLeg.timesequential}", "stopfrom": ${theLeg.stopFrom.id}, "stopto": ${theLeg.stopTo.id}, "geojson": ${geojsonStr} , "km": ${theLeg.km} }`;
            let postObj = JSON.parse(postObjStr);
            if (theLeg.startDateTime === '') {
                postObj.startdatetime = null;
            }
            if (theLeg.endDateTime === '') {
                postObj.enddatetime = null;
            }
            let resultJSON = await this.query("PATCH", postUrl, postObj);
            if (resultJSON.error === true) {
                this.giveErrorMsg(resultJSON);
                console.log(postObjStr);
                return false;
            } else {
                return true;
            }
        } catch (e) {
            UI.SetMessage("ERROR in patchLeg function in DB module:\n " +  + e
                + '\npostURl  = ' + postObjStr, errorMsg );
        }
    }
    ,
    patchJourney: async function (theJourney, ID) {
        let postObjStr='';
        try {
            let whereStr = '?id=eq.' + ID;
            let postUrl = '/journeys' + whereStr;
            postObjStr = `{ "notes": "${theJourney.notes}", "type": "${theJourney.type}", "startdatetime": 
                "${theJourney.startDateTime}", "enddatetime": "${theJourney.endDateTime}", "stopfrom": ${theJourney.stopFrom.id}, 
                "stopto": ${theJourney.stopTo.id}, "legsarray": "{${theJourney.legsIDArray}}" }`;
            let postObj = JSON.parse(postObjStr);
            let resultJSON = await this.query("PATCH", postUrl, postObj);
            if (resultJSON.error === true) {
                this.giveErrorMsg(resultJSON);
                console.log(postObjStr);
                return false;
            } else {
                return true;
            }
        } catch (e) {
            UI.SetMessage("ERROR in patchJourney function in DB module:\n " +  + e
                + '\npostURl  = ' + postObjStr, errorMsg );
        }
    }
    ,
    patchStop: async function (theStop, ID) {
        let postObjStr='';
        try {
            let whereStr = '?id=eq.' + ID;
            let postUrl = '/stops' + whereStr;
            let geojsonStr = JSON.stringify(theStop.geometry, null, 0);
            postObjStr = `{ "name": "${theStop.name}", "geojson": ${geojsonStr} }`;
            let postObj = JSON.parse(postObjStr);
            let resultJSON = await this.query("PATCH", postUrl, postObj);
            if (resultJSON.error === true) {
                this.giveErrorMsg(resultJSON);
                console.log(postObjStr);
                return false;
            } else {
                return true;
            }
        } catch (e) {
            UI.SetMessage("ERROR in patchStop function in DB module:\n " +  + e
                + '\npostURl  = ' + postObjStr, errorMsg );
        }
    }
    ,
    patchScreenBbox: async function (theBbox) {
        let postObjStr='';
        try {
            let whereStr = '?id=eq.1;' //there is only 1 row in screen bbox table = the current bbox!
            let postUrl = '/screenbbox' + whereStr;
            const ll = [theBbox[0],theBbox[1]];
            const ul = [theBbox[0],theBbox[3]];
            const ur = [theBbox[2],theBbox[3]];
            const lr = [theBbox[2],theBbox[1]];
            const theBBPoly = { // simple GeoJSON Polygon geometry [[[lon,lat],[lon,lat],...]]
                type: "Polygon",
                coordinates: [[ ll,ul,ur,lr,ll ]],
            };
            let geojsonStr = JSON.stringify(theBBPoly, null, 0);
            postObjStr = `{ "geojson": ${geojsonStr}  }`;
            let postObj = JSON.parse(postObjStr);
            let resultJSON = await this.query("PATCH", postUrl, postObj);
            if (resultJSON.error === true) {
                this.giveErrorMsg(resultJSON);
                console.log(postObjStr);
                return false;
            } else {
                return true;
            }
        } catch (e) {
            UI.SetMessage("ERROR in patchScreenBbox function [DB module]:\n " +  + e
                + '\npostURl  = ' + postObjStr, errorMsg );
        }
    }
    ,
    query: async function (verb, url, json) {
        let result = {};
        try {
            if (verb === "GET") {
                result = await this.PGapi.get(url);
            } else if (verb === "POST") {
                result = await this.PGapi.post(url).auth(this.authToken).send(json);
            } else if (verb === "PATCH") {
                result = await this.PGapi.patch(url).auth(this.authToken).send(json);
            } else if (verb === "DELETE") {
                result = await this.PGapi.delete(url).auth(this.authToken);
            } else {
                console.log('[in DB.js] This can never happen, can it?');
            }
            // console.log("PGapi result = " + result);
            return {
                "error": false,
                "data": result
            }
        } catch (error) {
            console.log(error);
            try { // use Postgrest error.response.body
                return {
                    "error": true,
                    "data": error.response.body
                }
            } catch (err) { // use general err
                return {
                    "error": true,
                    "data": error.toString()
                }
            }
        }
    }
} //end DB object