#!/usr/bin/bash
DRIVE=$1
DIR=`dirname $0`
if [ -L "$DIR/content/$DRIVE" ]; then
    /usr/bin/ln -s "/media/$DRIVE/content" "$DIR/content/$DRIVE"
    /usr/bin/rm "$DIR/content/$DRIVE"
fi
/usr/bin/umount "/media/$DRIVE"
/usr/bin/rmdir "/media/$DRIVE"
