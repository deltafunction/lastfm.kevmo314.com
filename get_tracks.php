<?php

header('Content-type: text/plain; charset=utf-8');

$username = !empty($_GET['username'])?$_GET['username']:'deltafunction';
$trackcount = !empty($_GET['trackcount'])?$_GET['trackcount']:'20';
$algorithm = !empty($_GET['algorithm'])?$_GET['algorithm']:'Neighbours';

echo shell_exec("./get_tracks.sh ".$username." ".$trackcount." ".$algorithm);

