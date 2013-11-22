Firefly
=======

Firefly parallels the Beacon neé Lumieres project as another host for the
Filament application.

Firefly will serve Filament itself for use inside a browser and also provide
services access to services for consumption in Filament much like Beacon does
through its associated Environment Bridge.

Running
=======

Filament needs to be on the "firefly" branch (for now)

If Firefly is checked out next to filament you can run:

```bash
npm start
```

Go to the server at http://app.127.0.0.1.xip.io:2440/ (This is a pass-through
service that allows us to use subdomains in development. It's a fake DNS server
that resolves all subdomains to whatever IP address you give it.)

Otherwise you can run:

```bash
node index.js --client=<directory containing filament>
```

Run `node index.js` with no arguments to get a list of command line options.

**TEMPORARILY `/clone` serves the `clone` directory next to the firefly directory**

Developing
==========

Logging
-------

```javascript
var log = require("logging").from(__filename);

log("string", {object: 1}, 123, "http://example.com");
```

Only use `console.log` while developing.

Session
-------

The session is available as `request.session`. After a Github auth it has a
`githubAccessToken` property, containing the token.

To store more data in the session just add a property to the `request.session`
object.

The session is stored in memory, and so after a server restart all sessions are
lost (and you need to go through the Github auth again to get another access
key).

Contributing
============
- Run `jshint` on your code to ensure it conforms to Filament standards

- Make sure all commit messages follow the 50 character subject/72 character
body [formatting used throughout git](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)

- Make sure commit messages start with uppercase present tense commands
e.g. Prefer "Clear selection when clicking templateExplorer" over
"Cleared selection when clicking templateExplorer"

Updating dependencies
---------------------

The dependencies are checked in [as recomended](http://www.futurealoof.com/posts/nodemodules-in-git.html)
by members of the community. To update them run:

```bash
npm run update-dependencies
```

This will remove all the existing dependencies, install and dedupe, and stage
the node_modules. At this point you should test and rollback any dependencies
that you don't want to update.

Deploying
=========

* Install Vagrant from http://www.vagrantup.com/
* Run `vagrant plugin install vagrant-digitalocean`
* To communicate with the Digital Ocean API, you need to intall some certificates: `brew install curl-ca-bundle` (using Homebrew)
    * **You may need to edit the Vagrant file to point `provider.ca_path` to the output from the above command**
* Run `vagrant up` (this currently deploys to Stuart's DigitalOcean account)
* Run `vagrant ssh` to ssh into the machine, then run the commented out commands at the bottom of `provision.sh`. Idealy this would happen automatically, but for some reason Firefly doesn't work when launched this way.

