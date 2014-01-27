Firefly
=======

Firefly parallels the Beacon neé Lumieres project as another host for the
Filament application.

Firefly will serve Filament itself for use inside a browser and also provide
services access to services for consumption in Filament much like Beacon does
through its associated Environment Bridge.

Running
=======

Initial setup
-------------

 1. You must check out Filament next to Firefly, so that it looks like this:
    ```
    filament/
    firefly/
    ```
 2. Install Vagrant from http://www.vagrantup.com/downloads.html
 3. Run `vagrant plugin install vagrant-cachier`. This will cache apt packages
    to speed up the initialization of the VMs

Starting
--------

Run `npm start`

This can take up to 15 minutes the first time as the local VMs are provisioned
from scratch.

You can then access the server at http://local-firefly.declarativ.net:2440/

### Resuming after sleep

Sometimes the VMs will not resume correctly after your laptop has gone to sleep
and been woken up again (it seems this happens most frequently with
`load-balancer`). You can force them to shutdown and boot again with:

```bash
vagrant halt -f load-balancer  # or replace `load-balancer` with another name
# The following warning is expected:
# vagrant-cachier was unable to SSH into the VM to remove symlinks!
vagrant up load-balancer
```

Stopping
--------

Run `npm stop`

This will shutdown the VMs. You can bring them back up with `npm start` which
should be reasonably fast now that they are all set up.

After running `npm stop` the machines are not using CPU, but still take up
disk space. Instead of `npm stop` you can run `vagrant destroy` to remove the
VMs from disk. You can use `npm start` to bring them back, but this will take
almost the same amount of time as the initial setup.

Developing
==========

Refreshing the server
---------------------

When you make changes to Firefly you will need to reload it by running:

```bash
vagrant ssh login -c "sudo naught deploy /home/montage/naught.ipc"
vagrant ssh project -c "sudo naught deploy /home/montage/naught.ipc"
```

Logging
-------

```javascript
var log = require("logging").from(__filename);

log("string", {object: 1}, 123, "http://example.com");
```

Only use `console.log` while developing.

Some special characters will change the output:

### `*` Errors

Wrapping a string in `*`s will make it appear red in the logs, this is useful
when you need to log an error:

```javascript
log("*some error*", error.stack)
```

Accessing logs
--------------

You can `ssh` into the different machines with `vagrant ssh $NAME`. Files are
generally located at `/srv`. You can run the commands below to directly follow
the logs for the different servers:

### Login

```bash
vagrant ssh login -c "tail -f /home/montage/stdout.log"

# When things go wrong:
vagrant ssh login -c "tail -f /home/montage/stderr.log"
vagrant ssh login -c "tail -f /var/log/upstart/firefly.log"
```

### Project

```bash
vagrant ssh project -c "tail -f /home/montage/stdout.log"

# When things go wrong:
vagrant ssh project -c "tail -f /home/montage/stderr.log"
vagrant ssh project -c "tail -f /var/log/upstart/firefly.log"
```

### Static file server (Filament)

```bash
vagrant ssh web-server -c "tail -f /var/log/nginx/filament.access.log"
```

### Load balancer

```
vagrant ssh load-balancer -c "tail -f /var/log/haproxy.log"
```

You can also see the state of HAProxy and the servers at
http://local-firefly.declarativ.net:2440/haproxy?stats and logging in with
user `montage`, password `Mont@ge1789`.

Session
-------

The session is available as `request.session`. After a Github auth it has a
`githubAccessToken` property, containing the token.

To store more data in the session just add a property to the `request.session`
object.

The session is stored in memory, and so after a server restart all sessions are
lost (and you need to go through the Github auth again to get another access
key).

Common errors
-------------

`XMLHttpRequest cannot load http://local-firefly.declarativ.net:2440/. No 'Access-Control-Allow-Origin' header is present on the requested resource. Origin 'null' is therefore not allowed access.`

This happens when the project subdomain doesn't have the session cookie. Why?
This is caused by a cross-domain request to the project domain. When the
project server doesn't have a valid session it does a 304 redirect back to the
app domain. This is blocked because there are no cross-domain headers on the
app domain. Hence the error showing the app domain in the message, and the
`Origin` being null because it comes from a redirect.

Provisioning
------------

Here are some more useful commands if you change any config files or other
aspects of the provisioning.

### Upstart services

If you need to change the Upstart config files you need to restart the service:

```bash
vagrant ssh login -c "sudo cp /vagrant/deploy/services/firefly-login.conf /etc/init/firefly-login.conf"
vagrant ssh login -c "sudo service firefly-login restart"

vagrant ssh project -c "sudo cp /vagrant/deploy/services/firefly-project.conf /etc/init/firefly-project.conf"
vagrant ssh project -c "sudo service firefly-project restart"
```

### HAProxy config file

The new config needs to be copied across and certain values replaced. (This
command is adapted from the Vagrantfile).

```bash
vagrant ssh load-balancer -c "sudo cp /vagrant/deploy/files/haproxy.cfg /etc/haproxy/haproxy.cfg;\
sudo sed -i.bak 's/server login1 [0-9\.]*/server login1 10.0.0.4/' /etc/haproxy/haproxy.cfg;\
sudo sed -i.bak 's/server login2 .*//' /etc/haproxy/haproxy.cfg;\
sudo sed -i.bak 's/server filament1 [0-9\.]*/server filament1 10.0.0.3/' /etc/haproxy/haproxy.cfg;\
sudo service haproxy reload"
```

Contributing
============
- Run the specs (`npm test`) at the project's root and make sure there is no `jshint` errors and all spec tests pass successfully.
  Note: make sure there is no firefly session running prior running the test.

- Make sure all commit messages follow the 50 character subject/72 character
body [formatting used throughout git](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)

- Make sure commit messages start with uppercase present tense commands
e.g. Prefer "Clear selection when clicking templateExplorer" over
"Cleared selection when clicking templateExplorer"

- Turn on "strip trailing whitespace on save" or equivalent in your editor

- Indent by 4 spaces, not tabs

Updating dependencies
---------------------

The dependencies are checked in [as recommendedd](http://www.futurealoof.com/posts/nodemodules-in-git.html)
by members of the community. To update them run:

```bash
npm run update-dependencies
```

This will remove all the existing dependencies, install and dedupe, and stage
the node_modules. At this point you should test and rollback any dependencies
that you don't want to update.

Deploying
=========

Deploying in managed through Jenkins at https://build.declarativ.com/jenkins/view/Aurora/job/Deploy%20Aurora/.

The server that is being deployed to must have the following environment variables set:

 * `IP_ADDRESS`
 * `NODE_ENV="production"`
 * `FIREFLY_PORT`
 * `FIREFLY_APP_URL`
 * `FIREFLY_PROJECT_URL`
 * `GITHUB_CLIENT_ID`
 * `GITHUB_CLIENT_SECRET`

The script currently used to deploy is available in `deploy.sh`.
