# To Do

## Version 1.0

- [x] Create nginx reverse proxy on Pi
-- [ ] Grab server domain from sketchbook config
- [x] Install certbot
-- [ ] Integrate with certbot
- [x] Add server domain field to config
- [x]Tag/category wiki
-- [x] Tag/category editing
- [x] Tag search auto complete
- [x] Create systemd service
- [x] Mount USB drives to content folder
- [x] Add an "admin" panel (must be logged in to view)
-- [x] Show software info (name, version, etc. from config)
-- [ ] Check boxes for config bools
-- [ ] Drop downs for config options (eg: apis enabled)
-- [x] Text inputs for config fields (eg: owner and email)
-- [ ] Config options should all have hover tooltip descriptions
-- [ ] Links to log files
-- [x] SQL command entry (if /api/sql endpoint is enabled; warn that this is dangerous)
-- [ ] "Refresh SSL Certificate" button
- [ ] New image upload
- [ ] Update image upload

### Setup walkthrough

- [ ] Determine if port 443 and 80 are in use
-- [ ] If not, determine if port forwarding is possible (may need to make Godot HTML project to create websocket server in browser)
- [ ] Set up Raspberry Pi SD from image
-- [ ] Set WiFi credentials if using WiFi
- [ ] Put SD card in Pi and connect power (Ethernet if not using WiFi)
- [ ] Scan for sketchbook.local from browser
-- [ ] Might fail if the Pi did not connect to the same network or if mDNS is not available. As a backup the Pi should write it's local IP address to a file in /boot
- [ ] Forward port 443 and 80 to Sketchbook's IP address
-- [ ] Confirm Sketchbook is reached on WAN port 80; continue setup locally
-- [ ] Input desired domain and trigger certbot
--- [ ] certbot may fail, display stdout and stderr via websocket
--- [ ] If certbot succeeds, try to GET /api/server.
---- [ ] If that fails, warn that port 443 may not be forwarded properly and show a button to check again
--- [ ] Enable "force https" nginx site and show link to "finish setup"
- [ ] "Congratulations on finishing setup!" Recommend "adding content" guide.


## Version 1.0

- [ ] Clean up Pi (reset git repository and user info)
- [ ] Config wiki/documentation
- [ ] API endpoints wiki/documentation
- [ ] Database wiki/documentation
- [ ] Admin panel improvements
-- [ ] "Restart" and "Update" buttons (need to figure out linux permissions)
---  [ ] Check for updates (display change logs)
- [ ] Create disk image from Pi SD

## Version 1.1

- [ ] Admin panel improvements
-- [ ] Recent log messages (live)
-- [ ] Update WiFi credentials form
--- [ ] Revert if connection fails for 1 minute
-- [ ] "Restart" and "Update" buttons (need to figure out linux permissions)
---  [ ] Check for updates (display change logs)
-- [ ] "Refresh SSL Certificate" button
--- [ ] Integrate with certbot

## Future

- [ ] Relevant tags given a query