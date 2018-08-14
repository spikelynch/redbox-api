//
// Provisioner - (c) 2018 University of Technology Sydney
//
// Tests for Redbox API

import { Redbox } from './Redbox';
import { Redbox1 } from './Redbox1';
import { Redbox2 } from './Redbox2';



import { expect } from 'chai';
const path = require('path');

const fs = require('fs-extra');
const config = require('config');
const _ = require('lodash');

const SERVERS = [ 'Test1_9' ];

const PTS = {
  'Test1_9': [ 'dmpt', 'dataset', 'self-submission' ],
  'Test2_0': [ 'rdmp', 'dataRecord', 'dataPublication',  'workspace' ]
};

const DIAG = './diag';


const FIXTURES = {
  'rdmp': {
    'Test1_9': {
      'type': 'dmpt',
      'data': './test/rb1_rdmp.json',
      'diag': './test/diag/Test1_9',
      'apiuser': 'admin',
      'user': 'user1',
      'permissions': {
        'view' : [ 'admin' ],
        'edit' : [ 'admin' ]
      }
    },
    'Test2_0': {
      'type': 'rdmp',
      'data': './test/rb2_rdmp.json',
      'diag': './test/diag/Test2_0',
      'apiuser': 'admin',
      'user': 'user1',
      'permissions': {
        'viewRoles' : [ 'Admin', 'Librarians' ],
        'editRoles' : [ 'Admin', 'Librarians' ],
        'view' : [ 'admin' ],
        'edit' : [ 'admin' ]
      }
    }
  },
  'image': './test/image.jpg',
  'text': './test/ds2.txt'
};




function rbconnect(server: string):Redbox {
  const cf = config.get('servers.' + server);
  if( cf['version'] === 'Redbox1' ) {
    return new Redbox1(cf);
  } else {
    return new Redbox2(cf);
  }
}

async function makerecord(rb:Redbox, server: string): Promise<string> {
  const ptype = FIXTURES['rdmp'][server]['type'];
  const mdj = await fs.readFile(FIXTURES['rdmp'][server]['data']);
  const oid = await rb.createRecord(mdj, ptype);
  return oid;
}


describe('Redbox', function() {
  SERVERS.forEach(server => {
    const rb = rbconnect(server);
    this.timeout(10000);
    
  
    it('can fetch lists of objects from ' + server, async () => {
      for( var i in PTS[server] ) {
        let pt = PTS[server][i];
        const oids = await rb.list(pt);
        expect(oids).to.not.be.empty;
      }
    });
    
    it('can fetch a record from ' + server, async () => {
      const oids = await rb.list(PTS[server][0]);
      expect(oids).to.not.be.empty;
      const oid = oids[0];
      const md = await rb.getRecord(oid);
      expect(md).to.not.be.null;
      expect(md['oid']).to.equal(oid);
      
    });
    
    it('can create a record in ' + server, async () => {
      const oid = await makerecord(rb, server);
      expect(oid).to.not.be.null;

      var md2 = await rb.getRecord(oid);
      expect(md2).to.not.be.null;

      const mdf2 = path.join(FIXTURES['rdmp'][server]['diag'], oid + '.out.json');
      await fs.writeJson(mdf2, md2);
      const mdj = await fs.readFile(FIXTURES['rdmp'][server]['data']);
      const md1 = JSON.parse(mdj);
      expect(md2).to.deep.equal(md1);
    });

    it('can read permissions from ' + server, async () => {
      const oid = await makerecord(rb, server);

      const perms = await rb.getPermissions(oid);
      expect(perms).to.not.be.undefined;

      expect(perms).to.deep.equal(FIXTURES['rdmp'][server]['permissions']);
    });

   	if( rb.version === 'Redbox2') {	
    	it('can set view permissions in ' + server, async () => {
      	const oid = await makerecord(rb, server);

      	const perms1 = await rb.getPermissions(oid);
      	expect(perms1).to.not.be.undefined;

      	const resp = await rb.grantPermission(oid, 'view', {
        	'users': [ FIXTURES['rdmp'][server]['user'] ]
      	});

      	var nperms = _.cloneDeep(FIXTURES['rdmp'][server]['permissions']);
      	nperms['view'].push(FIXTURES['rdmp'][server]['user']);

      	expect(resp).to.deep.equal(nperms);
    	});
    }

   	if( rb.version === 'Redbox2') {	
      it('can set edit permissions in ' + server, async () => {
	      const oid = await makerecord(rb, server);

  	    const perms1 = await rb.getPermissions(oid);
    	  expect(perms1).to.not.be.undefined;

	      const resp = await rb.grantPermission(oid, 'edit', {
  	      'users': [ FIXTURES['rdmp'][server]['user'] ]
    	  });

	      var nperms = _.cloneDeep(FIXTURES['rdmp'][server]['permissions']);
  	    nperms['edit'].push(FIXTURES['rdmp'][server]['user']);

    	  expect(resp).to.deep.equal(nperms);
    	});
   	}

    
    it('can write and read datastreams in ' + server, async () => {
      const oid = await makerecord(rb, server);
      console.log("oid = " + oid);
      expect(oid).to.not.be.undefined;
      const data = await fs.readFile(FIXTURES['text']);
      const dsid = "attachment.txt";
      console.log("About to write object datastream");
      const resp = await rb.writeDatastream(oid, dsid, data);
      console.log("Response" + JSON.stringify(resp));
      const data2 = await rb.readDatastream(oid, dsid);
      expect(data2).to.equal(data);
    });
    
  });
});


