#!/usr/bin/bash
DRIVE=$1
DIR=`dirname $0`
/usr/bin/mkdir -p "/media/$DRIVE"
/usr/bin/mount "/dev/$DRIVE" "/media/$DRIVE"
if [ -d "/media/$DRIVE/content" ]; then
    set PORT = `/usr/bin/cat $DIR/config.yaml | /usr/bin/grep port: | /usr/bin/rev | /usr/bin/cut -d' ' -f1 | /usr/bin/rev`
    set KEY = `/usr/bin/cat $DIR/config.yaml | /usr/bin/grep key: | /usr/bin/rev | /usr/bin/cut -d' ' -f1 | /usr/bin/rev`
    /usr/bin/ln -s "/media/$DRIVE/content" "$DIR/content/$DRIVE"
    /usr/bin/curl -d "key=$KEY&subdir=$DRIVE" -X POST "http://localhost:$PORT/api/gallery/refresh" -s > /dev/null&
fi
