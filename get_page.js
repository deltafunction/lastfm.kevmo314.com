var args = require('system').args;

var username = '';
var trackcount = '20';
var algorithm = 'Similar';
var loved = '1';
var popular = '0';
var library = '1';

if (args.length === 1) {
    console.log('Try to pass some arguments when invoking this script!');
}
else {
    /*args.forEach(function(arg, i) {
        console.log(i + ': ' + arg);
    });*/
	 username = args[1];
	 trackcount = args[2];
	 algorithm = args[3];
	 if(args.length > 4) {
		 loved = args[4];
	 }
	 if(args.length > 5) {
		 popular = args[5];
	 }
	 if(args.length > 6) {
		 library = args[6];
	 }
}

console.log(username+':'+trackcount+':'+algorithm);

var resourceWait  = 2000,
    maxRenderWait = 20000,
    url           = 'file:///mnt/old/home/fjob/Documents/lastfm/index.html?username='+
		username+'&trackcount='+trackcount+'&algorithm='+algorithm+'&loved='+loved+
		'&popular='+popular+'&library='+library;

var page          = require('webpage').create(),
    count         = 0,
    forcedRenderTimeout,
    renderTimeout;

page.viewportSize = { width: 1280, height : 1024 };

function doRender() {
    //page.render('page.png');
    console.log(page.content);
    phantom.exit();
}

page.onResourceRequested = function (req) {
    count += 1;
    console.log('LOG: '+'> ' + req.id + ' - ' + req.url);
    clearTimeout(renderTimeout);
};

page.onResourceReceived = function (res) {
    if (!res.stage || res.stage === 'end') {
        count -= 1;
        console.log('LOG: '+res.id + ' ' + res.status + ' - ' + res.url);
        if (count === 0) {
            renderTimeout = setTimeout(doRender, resourceWait);
        }
    }
};

page.open(url, function (status) {
    if (status !== "success") {
        console.log('LOG: '+'Unable to load url');
        phantom.exit();
    } else {
        forcedRenderTimeout = setTimeout(function () {
            console.log('LOG: '+'Missing: '+count);
            doRender();
        }, maxRenderWait);
    }
});