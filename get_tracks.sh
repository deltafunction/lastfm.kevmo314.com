#!/bin/bash

# Get LastFM recommendations
# Copyright, Frederik Orellana, 2017
# E.g.
# ./get_tracks.sh -t 50 -i mylastfmid --algorithm Similar --loved --popular --library

set -o errexit -o noclobber -o nounset -o pipefail

SCRIPTPATH=$( cd $(dirname $0) ; pwd -P )

usage() { echo "Usage: $0 [--username <string>][--tracks <int>][--algorithm <string>] [--loved][--popular][--library]" 1>&2; exit 1; }

args="$(getopt -o "u:t:a:l:p:m:"  -l "username:,tracks:,algorithm:,loved:,popular:,library:,help" -- "$@")"
eval set -- "$args"

if [ $? -ne 0 ]; then
	usage
fi

# Defaults
username=""
tracks="20"
algorithm="Similar"
loved="1"
popular="0"
library="1"

while [ $# -ge 1 ]; do
	case "$1" in
                -u|--username)
                        username="$2"
                        shift 2
                        ;;
                -t|--tracks)
                        tracks="$2"
                        shift 2
                        ;;
                -a|--algorithm)
                        algorithm="$2"
                        shift 2
                        ;;
                -l|--loved)
                        loved="$2"
                        shift 2
                        ;;
                -p|--popular)
                        popular="$2"
                        shift 2
                        ;;
                -m|--library)
                        library="$2"
                        shift 2
                        ;;
                -h|--help)
                        usage
                        exit 0
                        ;;
                --)
			# No more options left.
			shift
			break
			;;
		*)
			echo "Not implemented: $1" >&2
			exit 1
			;;
       esac
done

if [ -z "$username" ]; then
	usage
	exit 1
fi



i=0
echo -n "["
#cat page.html | \
phantomjs $SCRIPTPATH/get_page.js $username $tracks $algorithm $loved $popular $library | \
grep -v 'LOG: ' | sed 's|<tr|\n<tr|g' | grep -E '^<tr ' | \
while read line; do
	artist=`echo $line | sed -r 's|.*/([^/]+)/_/([^/^"]+)".*|\1|' | sed 's|\+| |g' | awk '{print tolower($0)}'`
	track=`echo $line | sed -r 's|.*/([^/]+)/_/([^/^"]+)".*|\2|'`
	#echo -n "Finding track $track by $artist" >&2
	url=`curl -X GET "https://api.spotify.com/v1/search?q=$track&type=track" 2>/dev/null | \
	jq ".tracks.items[] | select(.artists[].name | ascii_downcase | contains(\"$artist\")) | .uri" | head -1`
	if [ -n "$url" ]; then
		if [ $i -ne 0 ];then
			echo -n ,
		fi
		echo -n $url | sed 's| |,|g'
		i=$((i+1))
	fi
done
echo -n "]"
