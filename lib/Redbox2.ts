
import { BaseRedbox, Redbox } from "./Redbox";


const util = require('util');


/* Redbox v2.0 api */

/* https://redbox-mint.github.io/redbox-portal/additional-documentation/rest-api.html */

export class Redbox2 extends BaseRedbox implements Redbox {

  branding: string;
  portal: string;

  // Note: not using http://host/branding/portal/api as the base URL because
  // the endpoint I'm using to search is not on the api

  constructor(cf: Object) {
    super(cf);
    this.version = 'Redbox2';
    this.branding = cf['branding'];
    this.portal = cf['portal'];
    this.baseURL += '/' + this.branding + '/' + this.portal;
    this.initApiClient();
  }  

  
  async info(): Promise<Object> {
    return {};
  }

  
  async list(ptype: string, start?:number): Promise<string[]> {
    console.log("About to list");
    if( start === undefined ) {
      start = 0;
    }

    const pagen = 10;
    
    try {
      if( this.progress ) {
	this.progress(util.format("Searching for %s: %d", ptype, start));
      }
      let params = { recordType: ptype, start: start, rows: String(pagen) };
      let resp = await this.apiget('listRecords', params);
      let response = resp["response"];
      let numFound = response["numFound"];
      let docs = response["items"];
      let ndocs = docs.length
      let list = docs.map(d => d.id);
      if( start + ndocs < numFound ) {
	let rest = await this.list(ptype, start + ndocs);
	return list.concat(rest);
      } else {
	return list;
      }
    } catch(e) {
      console.log("Error " + e);
      return [];
    }
  }


  /* createRecord - add an object via the api.
     
     @metadata -> object containing the metadata
     @packagetype -> has to match one of the values supported
     by this redbox instance
     @options -> object with the following options
     oid -> to specify the oid
     skipReindex -> skip the reindex process
     
  **/
  
  async createRecord(metadata: Object, packagetype: string, options?: Object): Promise<string|undefined> {
    let url = 'api/records/metadata/' + packagetype;
    let params: Object = {};
    let resp = await this.apipost(url, metadata, options);
    console.log("Response: " + JSON.stringify(resp));
    if( resp && 'oid' in resp ) {
      return resp['oid'];
    } else {
      return undefined;
    }
  }


  // async deleteRecord(oid: string): Promise<bool> {
  //   let url = '/object/' + oid + '/delete';
  //   let resp = await this.apidelete(url);
  //   if( resp ) {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // }


  /* TODO - updated record */

  /* Returns the record, or undefined if it's not
     found */
  
  async getRecord(oid: string): Promise<Object|undefined> {
    try {
      let response = await this.apiget('api/records/metadata/' + oid);
      return response;
    } catch(e) {
      console.log("Error " + e);
      return undefined;
    }
  }
  
  /* The record's metadata is metadata about the record, not the
     metadata stored in the record (that's what getRecord returns)
     */
  
  async getRecordMetadata(oid: string): Promise<Object|undefined> {
    try {
      let response = await this.apiget('api/objectmetadata/' + oid);
      return response;
    } catch(e) {
      console.log("Error " + e);
      return undefined;
    }
  }
  
  
  /* this method looks like it's using the wrong url? */ 

  async updateRecordMetadata(oid: string, md: Object): Promise<Object|undefined> {
    try {
      let response = await this.apipost('/records/metadata/' + oid, md);
      return response;
    } catch(e) {
      console.log("Error " + e);
      return undefined;
    }
  }

  async getPermissions(oid): Promise<Object|undefined> {
    try {
      let response = await this.apiget('api/records/permissions/' + oid);
      return response;
    } catch(e) {
      console.log("Errror " + e);
      return undefined;
    }
  }


  /* Both grantPermission and removePermission take their users as an
     object like:

     {
        "users": [ "Mike.Lynch@domain.edu.au" ],
        "pendingUsers": [ "Joe.Hill@domain.edu.au" ]  
     }

     The API backend merges (or subtracts) these lists from the 
     current values.

     On success, both of these return a permissions object (the same
     as the one from getPermissions) showing the resulting state of the
     object's permissions.

  */


  async grantPermission(oid: string, permission: string, users: Object): Promise<Object|undefined> {
    try {
      let response = await this.apipost(
        'api/records/permissions/' + permission + '/' + oid,
        { params: users }
        );
      return response;
    } catch(e) {
      console.log("Error " + e);
      return undefined
    }
  }

  /* Revoke the permission (view or edit) from the users specified in the
     object 
  */


  async removePermission(oid: string, permission: string, users: Object): Promise<Object|undefined> {
    try {
      let response = await this.apidelete(
        'api/records/permissions/' + permission + '/' + oid,
        users
        );
      return response;
    } catch(e) {
      console.log("Error " + e);
      return undefined
    }
  }



  async writeDatastream(oid: string, dsid: string, data: any): Promise<Object> {
  	console.error("writeDatastreams not available");
  	return undefined;
    // try {
    //   let response = await this.apipost(
    //     'datastream/' + oid,
    //     data,
    //     { params: { datastreamId: dsid } }
    //   );
    //   return response;
    // } catch(e) {
    //   console.log("Error " + e);
    // }
  }


  async listDatastreams(oid: string): Promise<Object> {
  	console.error("listDatastreams not available - use the record metadata");
  	return undefined;
    // try {
    //   let response = await this.apiget('datastream/' +oid + '/list');
    //   return response;
    // } catch(e) {
    //   console.log("Error " + e);
    //   return undefined;
    // }
  }
  
  async readDatastream(oid: string, dsid: string): Promise<any> {
    try {
      let response = await this.apiget(
      	'api/records/datastreams/' + oid,
      	{ datastreamId: dsid },
      	{ responseType: "stream"}
      	);
      return response;
    } catch(e) {
      console.log("Error " + e);
    }
  }
}











