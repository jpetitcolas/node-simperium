import User from './user'
import Client from './client'
import Auth from './auth'
import Bucket from './bucket'
import Channel from './channel'
import util from './util'

export default function( appId, token, options ) {
	return new Client( appId, token, options );
}

export { Auth, User, Client, util, Bucket, Channel }
