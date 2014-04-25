#!/usr/bin/env bash -x
# normal mode: root /srv
# mop mode:    root /vagrant/.mop/srv
vagrant ssh web-server -c "sudo sed -i.bak -E 's@(\\s*root).*@\\1 /srv;@' /etc/nginx/nginx.conf && sudo nginx -s reload"
# normal mode: login.vm.synced_folder "../filament", "/srv/filament"
# mop mode:    login.vm.synced_folder ".mop/builds", "/srv"
sed -i.bak -E 's@(login.vm.synced_folder) ".mop/builds.*"@\1 "../filament", "/srv/filament"@' Vagrantfile
vagrant reload login
