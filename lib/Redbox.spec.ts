//
// Provisioner - (c) 2018 University of Technology Sydney
//
// Tests for Redbox API

import { Redbox } from './Redbox';
import { Redbox1 } from './Redbox1';
import { Redbox2 } from './Redbox2';

import { Readable } from 'stream';


const chai = require('chai');
const chaiFiles = require('chai-files');

chai.use(chaiFiles);

const expect = chai.expect;
const assert = chai.assert;
const file = chaiFiles.file;


const path = require('path');

const fs = require('fs-extra');
const config = require('config');
const _ = require('lodash');

const SERVERS = [ 'Test2_0' ];

const PTS = {
  'Test1_9': [ 'dmpt', 'dataset', 'self-submission' ],
  'Test2_0': [ 'rdmp', 'dataRecord', 'dataPublication',  'workspace' ]
};

const DIAG = './diag';
const OUTPUT = './test/output/';

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


async function stream2file(stream: Readable, fn: string): Promise<boolean> {
  var wstream = fs.createWriteStream(fn);
  stream.pipe(wstream);
  return new Promise<boolean>( (resolve, reject) => {
    wstream.on('finish', () => { resolve(true) }); 
    wstream.on('error', reject);
  });
}


// sync function to ensure OUTPUT is present and empty

function ensureEmptyDir(d) {
	fs.ensureDirSync(d);
	var contents = fs.readdirSync(d);
	for( var i = 0; i < contents.length; i++ ) {
		if( contents[i] != '.' && contents[i] != '..' ) {
			var fn = path.join(d, contents[i]);
			fs.removeSync(fn);
		}
	}
}


describe('Redbox', function() {
  SERVERS.forEach(server => {
    const rb = rbconnect(server);
    this.timeout(10000);

    beforeEach(() => ensureEmptyDir(OUTPUT));
    
    it.skip('can fetch lists of objects from ' + server, async () => {
      for( var i in PTS[server] ) {
        let pt = PTS[server][i];
        const oids = await rb.list(pt);
        expect(oids).to.not.be.empty;
      }
    });
    
    it.skip('can fetch a record from ' + server, async () => {
      const oids = await rb.list(PTS[server][0]);
      expect(oids).to.not.be.empty;
      const oid = oids[0];
      const md = await rb.getRecord(oid);
      expect(md).to.not.be.null;
      expect(md['oid']).to.equal(oid);
      
    });
    
    it.skip('can create a record in ' + server, async () => {
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

    it.skip('can read permissions from ' + server, async () => {
      const oid = await makerecord(rb, server);

      const perms = await rb.getPermissions(oid);
      expect(perms).to.not.be.undefined;

      expect(perms).to.deep.equal(FIXTURES['rdmp'][server]['permissions']);
    });

   	if( rb.version === 'Redbox2') {	
    	it.skip('can set view permissions in ' + server, async () => {
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
      it.skip('can set edit permissions in ' + server, async () => {
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
      const resp = await rb.writeDatastream(oid, dsid, data);
      const ds2 = await rb.readDatastream(oid, dsid);
      const outfile = path.join(OUTPUT, 'output.txt');
      const success = await(stream2file(ds2, outfile));
      assert(success);
      expect(file(outfile)).to.equal(file(FIXTURES['text']));
    });
    
  });
});


