import chai from 'chai';
import nock from 'nock';
import chaiAsPromised from 'chai-as-promised';

import jsonapiClient from '../src/index';
import makeSerializer from '../src/serializer';
import getList from './fixtures/get-list';
import getListNoMeta from './fixtures/get-list-no-meta';
import getManyReference from './fixtures/get-many-reference';
import getOne from './fixtures/get-one';
import create from './fixtures/create';
import update from './fixtures/update';
import getMany from './fixtures/get-many';
import getListInclude from './fixtures/get-list-include';
import createWithRelationship from './fixtures/create-with-relationship';

chai.use(chaiAsPromised);

const { expect } = chai;

const client = jsonapiClient('http://api.example.com', {
  total: 'total-count',
  relationshipsMap: {
    projects: {
      owner: 'users',
      collaborators: 'users',
    },
  },
});

let result;

describe('GET_LIST', () => {
  beforeEach(() => {
    nock('http://api.example.com')
      .get(/users.*sort=name.*/)
      .reply(200, getList);

    return client('GET_LIST', 'users', {
      pagination: { page: 1, perPage: 25 },
      sort: { field: 'name', order: 'ASC' },
    })
      .then((data) => { result = data; });
  });

  it('returns an object', () => {
    expect(result).to.be.an('object');
  });

  it('has a data property', () => {
    expect(result).to.have.property('data');
  });

  it('contains the right count of records', () => {
    expect(result.data).to.have.lengthOf(5);
  });

  it('contains valid records', () => {
    expect(result.data).to.deep.include({ id: 1, name: 'Bob' });
  });

  it('contains a total property', () => {
    expect(result).to.have.property('total').that.is.equal(5);
  });
});

describe('GET_MANY_REFERENCE', () => {
  beforeEach(() => {
    nock('http://api.example.com')
      .get(/users.*company_id.*1.*sort=-name.*/)
      .reply(200, getManyReference);

    return client('GET_MANY_REFERENCE', 'users', {
      pagination: { page: 1, perPage: 25 },
      sort: { field: 'name', order: 'DESC' },
      target: 'company_id',
      id: 1,
    })
      .then((data) => { result = data; });
  });

  it('returns an object', () => {
    expect(result).to.be.an('object');
  });

  it('has a data property', () => {
    expect(result).to.have.property('data');
  });

  it('contains the right count of records', () => {
    expect(result.data).to.have.lengthOf(5);
  });

  it('contains valid records', () => {
    expect(result.data).to.deep.include({ id: 1, name: 'Bob' });
  });

  it('contains a total property', () => {
    expect(result).to.have.property('total').that.is.equal(5);
  });
});

describe('GET_LIST with include', () => {
  beforeEach(() => {
    nock('http://api.example.com')
      .get(/projects.*sort=name.*/)
      .reply(200, getListInclude);

    return client('GET_LIST', 'projects', {
      pagination: { page: 1, perPage: 25 },
      sort: { field: 'name', order: 'ASC' },
    })
      .then((data) => { result = data; });
  });

  it('returns an object', () => {
    expect(result).to.be.an('object');
  });

  it('has owner (many-to-one relationship)', () => {
    expect(result.data[0]).to.have.property('owner').that.has.property('id').that.is.equal('3');
  });

  it('has owner attributes (many-to-one relationship)', () => {
    expect(result.data[0].owner).to.have.property('email').that.is.equal('xmr.nkr@gmail.com');
  });

  it('has collaborator (many-to-many relationship)', () => {
    expect(result.data[0]).to.have.property('collaborators').that.has.lengthOf(1);
  });

  it('has collaborator id (many-to-many relationship)', () => {
    expect(result.data[0].collaborators[0]).to.have.property('id').that.is.equal('6');
  });

  it('has collaborator attributes (many-to-many relationship)', () => {
    expect(result.data[0].collaborators[0]).to.have.property('email').that.is.equal('joselito@mailinator.com');
  });
});

describe('GET_ONE', () => {
  beforeEach(() => {
    nock('http://api.example.com')
      .get('/users/1')
      .reply(200, getOne);

    return client('GET_ONE', 'users', { id: 1 })
      .then((data) => { result = data; });
  });

  it('returns an object', () => {
    expect(result).to.be.an('object');
  });

  it('has record ID', () => {
    expect(result.data).to.have.property('id').that.is.equal(1);
  });

  it('has records attributes', () => {
    expect(result.data).to.have.property('name').that.is.equal('Bob');
  });
});

describe('CREATE', () => {
  beforeEach(() => {
    nock('http://api.example.com')
      .post('/users')
      .reply(201, create);

    return client('CREATE', 'users', { data: { name: 'Sarah' } })
      .then((data) => { result = data; });
  });

  it('returns an object', () => {
    expect(result).to.be.an('object');
  });

  it('has record ID', () => {
    expect(result.data).to.have.property('id').that.is.equal(6);
  });

  it('has records attributes', () => {
    expect(result.data).to.have.property('name').that.is.equal('Sarah');
  });
});

describe('CREATE with relationships', () => {
  beforeEach(() => {
    nock('http://api.example.com')
      .post('/projects')
      .reply(201, createWithRelationship);

    return client('CREATE', 'projects', {
      data: {
        type: 'projects',
        attributes: {
          name: 'Test project 666',
        },
        relationships: {
          collaborators: {
            data: [
              {
                type: 'users',
                id: '6',
              },
            ],
          },
        },
      },
    })
      .then((data) => { result = data; });
  });

  it('returns an object', () => {
    expect(result).to.be.an('object');
  });

  it('has record ID', () => {
    expect(result.data).to.have.property('id').that.is.equal('3');
  });

  it('has records attributes', () => {
    expect(result.data).to.have.property('name').that.is.equal('Test project 666');
  });

  it('does not have owner', () => {
    expect(result.data).not.to.have.property('owner');
  });

  it('does not have collaborators', () => {
    expect(result.data).not.to.have.property('collaborators');
  });
});

describe('UPDATE', () => {
  beforeEach(() => {
    nock('http://api.example.com')
      .patch('/users/1')
      .reply(200, update);

    return client('UPDATE', 'users', { id: 1, data: { name: 'Tim' } })
      .then((data) => { result = data; });
  });

  it('returns an object', () => {
    expect(result).to.be.an('object');
  });

  it('has record ID', () => {
    expect(result.data).to.have.property('id').that.is.equal(1);
  });

  it('has records attributes', () => {
    expect(result.data).to.have.property('name').that.is.equal('Tim');
  });
});

describe('DELETE', () => {
  beforeEach(() => {
    nock('http://api.example.com')
      .delete('/users/1')
      .reply(204, null);

    return client('DELETE', 'users', { id: 1 })
      .then((data) => { result = data; });
  });

  it('returns an object', () => {
    expect(result).to.be.an('object');
  });

  it('has record ID', () => {
    expect(result.data).to.have.property('id').that.is.equal(1);
  });
});

describe('UNDEFINED', () => {
  it('throws an error', () => {
    expect(() => client('UNDEFINED', 'users')).to.throw(Error, /Unsupported/);
  });
});

describe('Unauthorized request', () => {
  beforeEach(() => {
    nock('http://api.example.com').get('/users/1').reply(401);
  });

  it('throws an error', () => {
    expect(client('GET_ONE', 'users', { id: 1 }))
      .to.eventually
      .be.rejected
      .and.have.property('status');
  });
});

describe('GET_MANY', () => {
  beforeEach(() => {
    nock('http://api.example.com')
      .get(/.*filter.*id.*1.*/)
      .reply(200, getMany);

    return client('GET_MANY', 'users', { ids: [1, 2] })
      .then((data) => { result = data; });
  });

  it('returns an object', () => {
    expect(result).to.be.an('object');
  });

  it('has a data property', () => {
    expect(result).to.have.property('data');
  });

  it('contains the right count of records', () => {
    expect(result.data).to.have.lengthOf(1);
  });

  it('contains valid records', () => {
    expect(result.data).to.deep.include({ id: 1, name: 'Bob' });
  });

  it('contains a total property', () => {
    expect(result).to.have.property('total').that.is.equal(1);
  });
});

// This test should work exactly the same as the normal GET_LIST test, but the
// returned data has no meta field, and thus no count variable. We set the
// count variable to null in the client
describe('GET_LIST with {total: null}', () => {
  it('contains a total property', () => {
    nock('http://api.example.com')
      .get(/users.*sort=name.*/)
      .reply(200, getListNoMeta);

    const noMetaClient = jsonapiClient('http://api.example.com', {
      total: null,
    });

    return expect(noMetaClient('GET_LIST', 'users', {
      pagination: { page: 1, perPage: 25 },
      sort: { field: 'name', order: 'ASC' },
    })).to.eventually.have.property('total').that.is.equal(5);
  });
});

describe('serializer', () => {
  const serializer = makeSerializer({
    projects: {
      owner: 'users',
      collaborators: 'users',
    },
  });

  const expected = {
    data: {
      type: 'projects',
      id: '2',
      attributes: {
        name: 'Test project',
      },
      relationships: {
        owner: {
          data: {
            type: 'users',
            id: '3',
          },
        },
        collaborators: {
          data: [
            {
              type: 'users',
              id: '4',
            },
            {
              type: 'users',
              id: '5',
            },
          ],
        },
      },
    },
  };

  it('serializes object with string array relationship', () => {
    const serialized = serializer('projects', {
      id: '2',
      name: 'Test project',
      owner: { id: '3' },
      collaborators: ['4', '5'],
    });

    expect(serialized).to.be.equal(JSON.stringify(expected));
  });

  it('serializes object with object array relationship', () => {
    const serialized = serializer('projects', {
      id: '2',
      name: 'Test project',
      owner: { id: '3' },
      collaborators: [{ id: '4' }, { id: '5' }],
    });

    expect(serialized).to.be.equal(JSON.stringify(expected));
  });

  it('serializes object with string in relationship', () => {
    const serialized = serializer('projects', {
      id: '2',
      name: 'Test project',
      owner: '3',
      collaborators: ['4', '5'],
    });

    expect(serialized).to.be.equal(JSON.stringify(expected));
  });
});
