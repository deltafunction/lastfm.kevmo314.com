<?php

header('Content-type: text/plain; charset=utf-8');

$tracks = $_GET['tracks'];
$callback = $_GET['callback'];

$tracks_array = json_decode($tracks, true);
$uris = array();

foreach($tracks_array as $song){
	$track = urlencode($song['title']);
	$artist = $song['artist'];
	$uri = shell_exec('curl -X GET "https://api.spotify.com/v1/search?q='.$track.'&type=track" 2>/dev/null | \
	jq ".tracks.items[] | select(.artists[].name | ascii_downcase | contains(\"'.''.'\")) | .uri" | head -1');
	$uri = str_replace('"', '', $uri);
	$uri = trim($uri);
	if(!empty($uri)){
			$uris[] = $uri;
	}
}

if(empty($callback)){
	echo json_encode($uris);
}
else{
	echo $callback."(".json_encode($uris).")";
}


