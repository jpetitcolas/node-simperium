import Auth from '../../src/simperium/auth'
import https from 'https'
import { equal, deepEqual } from 'assert'
import { EventEmitter } from 'events'
import nock from 'nock';

const stub = ( respond ) => {
    https.request = ( options, handler ) => {
        const req = new EventEmitter()
        req.end = ( body ) => respond( body, handler )
        return req
    }
}

const stubResponse = ( data ) => stub( ( body, handler ) => {
    const response = new EventEmitter()
    handler( response )
    response.emit( 'data', data )
    response.emit( 'end' )
} )

describe( 'Auth', () => {
    var auth

    beforeEach( () => {
        auth = new Auth( 'token', 'secret' );
    } )

    it( 'getUrlOptions', () => {
        const { hostname, headers, pathname, method } = auth.getUrlOptions( 'path' )
        equal( method, 'POST' )
        equal( hostname, 'auth.simperium.com' )
        equal( pathname, '/1/token/path' )
        deepEqual( headers, { 'X-Simperium-API-Key': 'secret' } )
    } )

    describe('.authorize', () => {
        it( 'should request auth token', ( done ) => {
            stub( ( data, handler ) => {
                const { username, password } = JSON.parse( data )
                const response = new EventEmitter()
                equal( username, 'username' )
                equal( password, 'password' )

                handler( response )
                response.emit( 'data', '{\"access_token\": \"secret-token\"}' )
                response.emit( 'end' );
            } )

            auth.authorize( 'username', 'password' )
            .then( ( user ) => {
                equal( user.access_token, 'secret-token' )
                done()
            } )
        } )

        it( 'should fail to auth with invalid credentials', ( done ) => {
            stubResponse( 'this is not json' )

            auth.authorize( 'username', 'bad-password' )
            .catch( ( e ) => {
                equal( e.message, 'this is not json' )
                done()
            } )
        } )
    });

    describe.only('.create', done => {
        it('should request `create/` Auth API endpoint', () => {
            const expectedCall = nock('https://auth.simperium.com')
                .post('/1/token/create/')
                .reply(200);

            auth.create('john.doe@simperium.com', 'password');
            equal(expectedCall.isDone(), true);
        });

        it('should pass correct payload containing username and password', () => {
            const expectedCall = nock('https://auth.simperium.com')
                .post('/1/token/create/', {
                    username: 'john.doe@simperium.com',
                    password: 'password'
                })
                .reply(200);

            auth.create('john.doe@simperium.com', 'password');
            equal(expectedCall.isDone(), true);
        });

        it('should resolve promise with freshly created user object in case of success', done => {
            const expectedCall = nock('https://auth.simperium.com')
                .post('/1/token/create/')
                .reply(200, {
                    username: 'test@test.com',
                    access_token: '84f27d20f93b414f8b7bc3441f87c9e1',
                    userid: 'f5067cc81c9c26dcdca468f0cdf60508'
                });

            auth.create('john.doe@simperium.com', 'password')
                .then(createdUser => {
                    deepEqual(createdUser, {
						options: {
							username: 'test@test.com',
							access_token: '84f27d20f93b414f8b7bc3441f87c9e1',
							userid: 'f5067cc81c9c26dcdca468f0cdf60508'
                        },
						access_token: '84f27d20f93b414f8b7bc3441f87c9e1'
                    });
                    done();
                })
                .catch(done);
        });

        it('should reject the promise with some error details in case of failure', done => {
            const expectedCall = nock('https://auth.simperium.com')
                .post('/1/token/create/')
                .reply(500, 'Invalid call');

            auth.create('john.doe@simperium.com', 'password')
                .catch(err => {
                    equal(err.message, 'Invalid call');
                    done();
                });
        });
    });
} )
