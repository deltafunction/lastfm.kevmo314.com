<?php


$user = $_GET['user'];
$callback = $_GET['callback'];

$neighbours = shell_exec("curl 'http://www.last.fm/user/$user/neighbours' | grep -E 'They both.*/user/' | sed -r 's|.*/user/([^/]*)/.*|\\1|' | tr '\\n' ' '");

$neighbors_array = explode(" ", trim($neighbours));

if(empty($callback)){
	echo json_encode($neighbors_array);
}
else{
	echo $callback."(".json_encode($neighbors_array).")";
}


