# To Do

## Version 1.0

- [x] Create nginx reverse proxy on Pi
  - [x] Grab server domain from sketchbook config and automatically update `sites-available/sketchbook` file
- [x] Add server domain field to config
- [x]Tag/category wiki
  - [x] Tag/category editing
- [x] Tag search auto complete
- [x] Create systemd service
- [x] Mount USB drives to content folder
- [x] Add an "admin" panel (must be logged in to view)
  - [x] Show software info (name, version, etc. from config)
  - [x] Check boxes for config bools
  - [x] Drop downs for config options (eg: apis enabled)
  - [x] Text inputs for config fields (eg: owner and email)
  - [x] Config options should all have hover tooltip descriptions
  - [x] Links to log files
  - [x] SQL command entry (if /api/sql endpoint is enabled; warn that this is dangerous)
- [x] New image upload
- [x] Update image upload
- [x] SubscribeStar API integration
  - [x] Creator OAuth setup in /admin
  - [x] Censor "premium" items
  - [x] Show "connect to SubscribeStar" link on censored images if viewer doesn't have active OAuth access token
- [x] Admin password should query the "sketchbook" user's password on the system using `openssl passwd` instead of leaving it plaintext in the config

## Beta Release

- [x] Config wiki/documentation
- [x] API endpoints wiki/documentation
- [x] Search wiki/documentation
- [ ] Database wiki/documentation
- [ ] Admin panel improvements
  - [ ] "Restart" and "Update" buttons
- [ ] Create install script

### Install Script

- [ ] Ensure running as 'sudo'
- [ ] Ask if the hostname should be changed to "sketchbook"
- [ ] Installs prerequisites
  - [ ] apt: nginx avahi-daemon whois certbot
  - [ ] nvm -> nodejs and npm
  - [ ] npm packages
- [ ] Requests initial config information:
  - [ ] Server domain
    - [ ] DNS lookup (`host -4 -t A ${domain} | cut -d' ' -f4`) to confirm it points to this machine's public IP (`curl ifconfig.co -4`) with `[[ diff <(command1) <(command2) ]]`
    - [ ] Check port 443 is forwarded to this device (), provide an error and link to setup guide if not
    - [ ] Check port 80 is forwarded to this device, provide a warning (might be intentional) and link to setup guide if not
  - [ ] Artist name
  - [ ] Website name (default: My Sketchbook Gallery)
  - [ ] Artist email
  - [ ] Admin password
    - [ ] Create new user "sketchbook" with provided admin password and the groups: sketchbook, www-data, shadow
    - [ ] Add following file as `/etc/sudoers.d/sketchbook-power`: `sketchbook ALL=NOPASSWD: /sbin/reboot now, /sbin/poweroff now`
- [ ] Downloads most recent release from Github to /home/sketchbook/
- [ ] Allow "sketchbook" user to restart nginx systemctl service
- [ ] Create, start, and enable "sketchbook" systemctl service which runs `node /home/sketchbook/index.js` as "sketchbook"
- [ ] Create nginx file `sites-available/sketchbook` (owned by sketchbook:sketchbook) reverse proxy to internal port 8090
  - [ ] DDoS prevention for nginx config: https://blog.nginx.org/blog/mitigating-ddos-attacks-with-nginx-and-nginx-plus
- [ ] If port 80 is forwarded to this device: 
  - [ ] Ask to enable nginx reverse proxy ("yes" suggested if user doesn't have another webserver on the network)
  - [ ] "Yes" will create a symbolic link from nginx's `sites-enabled/sketchbook` to `sites-available/sketchbook` and run certbot for the domain: `certbot --agree-tos --nginx -d ${domain} -m ${email} -n` (should return 0)
- [ ] Congratulate user for setting up and tell them to go to `https://${domain}/admin` in a web browser and enter their password to upload content

## Public Release

- [ ] Prevent adding an item to the gallery database if an entry already exists with the same hash
- [ ] SubscribeStar API integration
  - [ ] Show "upgrade subscription" link on censored images if viewer has OAuth access token, but not the correct subscription tier
- [ ] Admin panel improvements
  - [ ] Check for updates (display change logs)
  - [ ] "Update" button which effectively unpacks the latest version to the current folder
- [ ] Add `meta:hidden` tag which prevents an item from being listed in search or viewed by non-admins
  - [ ] Apply the `meta:hidden` tag to items by default
  - [ ] `meta:hidden` should be ignored by `meta:untagged`
- [ ] Setup walkthroughs
  - [ ] Raspberry Pis
  - [ ] Orange Pi Zero 2W
  - [ ] Orange Pi 3
  - [ ] Radxa Zero 3E
  - [ ] Unused desktop PC as a server

## Version 1.1

- [ ] Admin panel improvements
  - [ ] Recent log messages (live)
  - [ ] Update WiFi credentials form
    - [ ] Revert if connection fails for 1 minute
  - [ ] "Refresh SSL Certificate" button to manually run certbot

## Future

- [ ] Relevant tags given a query