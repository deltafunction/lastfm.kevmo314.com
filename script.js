var minSampleSize = 5;
var sampleSize = 20;

function getParam(href, key) {
	var results = new RegExp('[\?&]' + key + '=([^&#]*)').exec(href);
	if (results==null){
		return null;
	}
	else{
		return results[1] || 0;
	}
}

function getGetParam(key) {
	return this.getParam(window.location.href, key);
}

$(document).ready(function() {
	var lastfm = new LastFM({
		apiKey:'93d2b112d71a23258406f6fb63d20daa',
		apiSecret:'d84b67b0a14492c9b5047e49e6d6f502'
	});
	
	var username = getGetParam('username');
	var trackCount = getGetParam('trackcount');
	var algorithm = getGetParam('algorithm');
	var useLoved = getGetParam('loved');
	var preferTop = getGetParam('popular');
	var includeLibrary = getGetParam('library');

	var libraryScrobbleCount = 0, libraryPlayCount = 0;
	var signatureHashes = {};
	var signatureIndex = 0;

	var $progressBar = $("#progressbar").progressbar({value: 0}).hide().append('<div id="progress-message"><span id="progress-text"></span> <span id="progress-value"></span></div>');
	var $progressText = $("#progress-text", $progressBar);
	var $progressValue = $("#progress-value", $progressBar);
	var $resultsTable = $("#results > tbody");
	$("#recommendation-form").submit(function() {
		if(!getGetParam('username') || !getGetParam('trackcount') || !getGetParam('algorithm')){
			initialize();
		}
		else{
			if(typeof useLoved===null){
				useLoved = $('input[name="prefer_loved"]:checked').length>0;
			}
			if(typeof preferTop===null){
				preferTop = $('input[name="prefer_top"]:checked').length>0;
			}
			if(typeof includeLibrary===null){
				includeLibrary = $('input[name="include_library"]:checked').length>0;
			}
		}
		loadUserLibrary(username).done(function(localLibrary) {
			generateStatistics(localLibrary);
			if(algorithm == "Library") {
				shuffle(localLibrary);
				$progressText.text("Finding tracks...");
				addUserToChart({'name': username}, localLibrary);
			} else if(algorithm == "Similar") {
				shuffle(localLibrary);
				$progressText.text("Finding similar tracks...");
				for(var i = 0; i < trackCount; i++) {
					if(typeof localLibrary[i] === 'undefined'){
						renderMessage('error', "No track "+i);
						continue;
					}
					addSimilarToChart(localLibrary[i], localLibrary);
				}
			} else if(algorithm == "Popular") {
				$progressText.text("Finding similar tracks...");
				for(var i = 0; i < trackCount; i++) {
					var max = -1, maxSignature = null;
					for(var signature in localLibrary) {
						if(typeof localLibrary[signature] === 'undefined'){
							renderMessage('error', "No track "+signature+":"+signatureIndex+":"+signature);
							continue;
						}
						if(typeof localLibrary[signature].playcount === 'undefined' ||
							localLibrary[signature].playcount > max) {
							max = localLibrary[signature].playcount;
							// Index of the track with the highest playcount in library
							maxSignature = signature;
						}
					}
					addSimilarToChart(localLibrary[maxSignature], localLibrary);
					// This is to not count this track in the next iteration's search for the
					// track with the highest playcount
					localLibrary[maxSignature].playcount = -1;
				}
			} else if(algorithm == "Neighbours") {
				$progressText.text("Finding neighbours...");
				lastfm.user.getNeighbours({user:username}, {success:function(data) {
					//shuffle(data);
					$.each(data, function(i, user) {
						//renderMessage('highlight', "Neighbour "+i+":"+user);
						if(i < trackCount) {
							addUserToChart({'name': user}, localLibrary);
						}
						else{
							return false;
						}
					});
				}, error:function(code, message){
					renderError(message);
					finish();
				}});
			} else if(algorithm == "Friends") {
				$progressText.text("Finding friends...");
				lastfm.user.getFriends({user:username}, {success:function(data) {
					$progressText.text("Finding friends' top tracks...");
					shuffle(data.friends.user);
					$.each(data.friends.user, function(i, user) {
						$progressText.text("Friend "+i+":"+data.friends.user[i].name);
						if(i < trackCount) { // Using the same number of users as sampled tracks seems
							addUserToChart(data.friends.user[i], localLibrary);
						}
						else{
							return false;
						}
						$progressText.text("");
						$progressValue.text("");
					});
				}, error:function(code, message){
					renderError(message);
					finish();
				}});
			}
			else if(algorithm == "Mix") {
				renderMessage('highlight', "Finding neighbours...");
				lastfm.user.getNeighbours({user:username}, {success:function(data) {
					shuffle(data);
					$.each(data, function(i, user) {
						//renderMessage('highlight', "Neighbour "+i+":"+user);
						if(i < trackCount/4) {
							addUserToChart({'name': user}, localLibrary);
						}
						else{
							return false;
						}
					});
				}, error:function(code, message){
					renderError(message);
					finish();
				}});
				shuffle(localLibrary);
				renderMessage('highlight', "Finding similar tracks...");
				for(var i = 0; i < trackCount/2; i++) {
					if(typeof localLibrary[i] === 'undefined'){
						renderMessage('error', "No track "+i);
						continue;
					}
					addSimilarToChart(localLibrary[i], localLibrary);
				}
				shuffle(localLibrary);
			}
		});
		return false;
	});
	// From http://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array-in-javascript
	function shuffle(a) {
		var firstTrack = true;
		for(var i in a) {	
			if(firstTrack){
				firstTrack = false;
				continue;
			}
			// ES6
			//var j = Math.floor(Math.random() * i);
			//[a[i - 1], a[j]] = [a[j], a[i - 1]];
			j = Math.floor(Math.random() * i);
			x = a[i - 1];
			a[i - 1] = a[j];
			a[j] = x;
		}
	}
	function generateStatistics(localLibrary) {
		libraryScrobbleCount = 0;
		libraryPlayCount = 0;
		for(var signature in localLibrary) {
			libraryScrobbleCount++;
			libraryPlayCount += parseInt(localLibrary[signature].playcount);
		}
		showStatisticsMessage(libraryScrobbleCount, libraryPlayCount);
	}
	function initialize() {
		$("input[type=submit]").attr('disabled', true);
		$("#errors > div").each(function() {
			$(this).slideUp();
		});
		$resultsTable.html("");
		$progressBar.progressbar("value", 0).slideDown();
		$progressText.text("");
		$progressValue.text("");
		username = $("#input-username").val();
		trackCount = $("#select-similar-track-count").val();
		algorithm = $("input[name=algorithm]:checked").val();
		useLoved = $('input[name="prefer_loved"]:checked').length>0;
		preferTop = $('input[name="prefer_top"]:checked').length>0;
		includeLibrary = $('input[name="include_library"]:checked').length>0;
	}
	function finish() {
		//$progressBar.slideUp();
		$("input[type=submit]").removeAttr('disabled');
		if($('tr td.name').length){
			$('#get_spotify_playlist').show();
		}
	}
	
	function getTrackProgress() {
		return (getGroupProgress() /*/ trackCount*/);
	}
	function getGroupProgress() {
		return (1 / trackCount);
	}
	function incrementProgress(amount) {
		$progressBar.progressbar("value", ($progressBar.progressbar("value") + amount * 100));
		$progressValue.text((Math.round($progressBar.progressbar("value") * 10) / 10).toFixed(1)+"%");
		if(Math.abs(100 - $progressBar.progressbar("value")) < 0.001) {
			finish();
			$progressValue.text("");
		}
	}
	function showStatisticsMessage(uniqueSongs, totalPlayCount) {
		var average = Math.round(10 * totalPlayCount / uniqueSongs) / 10;
		renderMessage('highlight', 'Your library has ' + uniqueSongs + ' song' + (uniqueSongs == 1 ? '' : 's') + '. Each song has been played an average of ' + average + ' time' + (average == 1 ? '' : 's') + '.');
	}
	function renderError(message) {
		renderMessage('error', message);
	}
	function renderMessage(type, message) {
		$("<div class='ui-state-" + type + " ui-corner-all ui-widget'>" + message + "</div>").appendTo($("#errors")).hide().slideDown().click(function() {
			$(this).slideUp();
		});
	}
	function clearMessage(type, message) {
		$("#errors div").remove();
	}
	function getTopTracks(params, callbacks){
		lastfm.user.getTopTracks(params, {
			success:function(data) {
				newdata = {
					"tracks": data.toptracks
				};
				callbacks.success(newdata);
			},
			error:function(code, message){
				callbacks.error(code, message);
			}
		});
	}
	function getLovedTracks(params, callbacks){
		lastfm.user.getLovedTracks(params, {
			success:function(data) {
				newdata = {
					"tracks": data.lovedtracks
				};
				callbacks.success(newdata);
			},
			error:function(code, message){
				callbacks.error(code, message);
			}
		});
	}
	function getTracks(params, callbacks){
		if(!useLoved){
			getTopTracks(params, callbacks);
		}
		else{
			// Try and get a sample of loved tracks
			lastfm.user.getLovedTracks(params, {
				success:function(data) {
					if(useLoved && data.lovedtracks.track.length>=minSampleSize){
						newdata = {
							"tracks": data.lovedtracks
						};
						callbacks.success(newdata);
					}
					// Fall back to top tracks
					else{
						//renderMessage('highlight', 'Falling back to top tracks. '+data.lovedtracks.track.length+'<'+minSampleSize);
						getTopTracks(params, callbacks);
					}
				},
				error:function(code, message){
					callbacks.error(code, message);
				}
			});
		}
	}
	function getTrackCount(username) {
		var deferred = $.Deferred();
		$progressText.text("Getting track count...");
		getTracks({user:username, limit:trackCount}, {success:function(data) {
			var tracksCount = parseInt(data.tracks['@attr'].total);
			deferred.resolve(tracksCount);
		}, error:function(code, message){
			renderError(message);
			finish();
		}});
		return deferred.promise();
	}
	function loadUserLibrary(username) {
		var deferred = $.Deferred();
		var library = {};
		getTrackCount(username).done(function(tracksCount) {
			$progressText.text("Fetching your library...");
			var pages = Math.ceil(tracksCount / 100);
			var pagesResolved = 0;
			for(var i = 0; i < pages; i++) {
				getTracks({user:username, page:(i + 1), limit:100}, {success:function(data) {
					for(var j = 0; j < data.tracks.track.length; j++) {
						if(library[getTrackSignature(data.tracks.track[j])] === undefined) {
							library[getTrackSignature(data.tracks.track[j])] = {track:data.tracks.track[j].name, artist:data.tracks.track[j].artist.name, playcount:data.tracks.track[j].playcount};
						}
					}
					if((++pagesResolved) == pages) {
						deferred.resolve(library);
					}
				}, error:function(code, message){
					renderError(message);
					finish();
				}});
			}
		});
		return deferred.promise();
	}
	function getTrackSignature(trackObject) {
		if(signatureHashes[(trackObject.name + trackObject.artist.name)] === undefined) {
			signatureHashes[(trackObject.name + trackObject.artist.name)] = signatureIndex++;
		}
		return signatureHashes[(trackObject.name + trackObject.artist.name)];
	}
	function addSimilarToChart(metadata, localLibrary) {
		//sampleSize = +(trackCount);
		superSampleSize = 3 * sampleSize;
		lastfm.track.getSimilar({artist:metadata.artist, track:metadata.track,
			limit:superSampleSize, autocorrect:1},
			{success:function(data) {
			if(data.similartracks['@attr'] !== undefined) {
				shuffle(data.similartracks.track);
				var i = 0;
				$.each(data.similartracks.track, function(index, track) {
					if(i>=sampleSize){
						return false;
					}
					setTimeout(function() {
						//renderMessage('highlight', 'Adding: '+track.name+':'+track.playcount);
						if(!preferTop) {
							track.playcount = 1;
						}
						processTrack(track, localLibrary);
					}, index * 50);
					++i;
				});
			} else {
				console.debug('Couldn\'t find ' + metadata.artist + ' - ' + metadata.track);
			}
			incrementProgress(getGroupProgress());
		}, error:function(code, message){
			renderError(message);
			incrementProgress(getGroupProgress());
		}});
	}
	function addUserToChart(user, localLibrary) {
		getTrackCount(username).done(function(tracksCount) {
			//sampleSize = +(trackCount);
			superSampleSize = (tracksCount >= 3 * sampleSize) ? tracksCount : (3 * sampleSize);
			pages = Math.round(tracksCount / superSampleSize);
			page = Math.ceil(Math.random() * pages);
			getTracks({user:user.name, limit:superSampleSize, page: page}, {success:function(data) {
				shuffle(data.tracks.track);
				var i = 0;
				$.each(data.tracks.track, function(index, track) {
					if(i>=sampleSize){
						return false;
					}
					setTimeout(function() {
						if(!preferTop) {
							track.playcount = 1;
						}
						else if(!useLoved && user.name==username){
							track.playcount = track['@attr'].rank;
						}
						processTrack(track, localLibrary);
					}, index * 50);
					++i;
				});
			}, error:function(code, message) {
				renderError(message);
				incrementProgress(getGroupProgress());	
			}});
		});
	}
	function processTrack(track, localLibrary) {
		if(localLibrary[getTrackSignature(track)] === undefined || includeLibrary) {
			addWeight(track);
		}
		else{
			//renderMessage('highlight', 'Already in your library: '+track.name);
		}
		incrementProgress(getTrackProgress());
	}
	function lookupSpotifyTrack(artist, album, track){
		lastfm.spotify_call(method, params, callbacks, requestMethod, url);
	}
	function addTrackToChart(track) {
		return $("<tr id='" + getTrackSignature(track) + "' playcount='0'><td class='name'><a href='" 
			+ track.url + "' target='_blank'>" + track.name + "</a></td><td class='artist'><a href='" 
			+ track.artist.url + "' target='_blank'>" + track.artist.name 
			+ "</a></td><td class='playcount'>0</td>"+
			"<td><a target='_blank' href='https://play.spotify.com/search/artist%3A" + track.artist.name + "%2C%20track%3A" + track.name + "'><img src='css/spotify.png'/ width='24px' /></a></td>"+
			"<td><a target='_blank' href='http://www.amazon.com/s/?tag=kevmo314-20&field-keywords=" + track.artist.name + "%20" + track.name + "'><img src='css/amazon.png'/ width='22px' /></a></td>"+
			"</tr>").appendTo($resultsTable);
	}
	function addWeight(track) {
		var $rowObject = $("#" + getTrackSignature(track), $resultsTable);
		if($rowObject.size() == 0) {
			$rowObject = addTrackToChart(track);
		}
		var newPlayCount = parseInt($rowObject.attr("playcount")) + parseInt(track.playcount);
		$rowObject.attr("playcount", newPlayCount);
		$rowObject.find(".playcount").text(newPlayCount);
		// Percolate up
		var previousSibling;
		while((previousSibling = $rowObject.prev()) != null && parseInt(previousSibling.attr("playcount")) < newPlayCount) {
			$rowObject.insertBefore(previousSibling);
		}
		$progressText.text($('tr td.name a').length + " tracks");
	}
	
	if(username && trackCount && algorithm){
		$("#recommendation-form").submit();
		//$("#recommendation-form input[type='submit']").click();
	}
	
	$('#progressbar').click(function(ev){
		clearMessage();
	});
	
	$('#get_spotify_playlist').click(function(ev){
		var tracks = [];
		var i = 0;
		$('tr').each(function(el){
			if(i>20){
				renderMessage('highlight','Truncating to 20');
				return false;
			}
			if($(this).find('td.name').text()){
				var track = new Object();
				track.title = $(this).find('td.name').text();
				track.artist = $(this).find('td.artist').text();
				tracks.push(track);
			}
			++i;
		});
		renderMessage('highlight','Finding tracks...');
		lastfm.user.getSpotifyPlaylist({tracks:JSON.stringify(tracks)}, {success:function(data) {
			$progressText.text("");
			$progressValue.text("");
			alert(data.toSource());
		}, error:function(code, message){
			renderError(message);
			finish();
		}});
	});
	
	$('#get_spotify_playlist').hide();
	
});
