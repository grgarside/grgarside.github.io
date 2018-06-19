// instructions:
// - host a copy of callback.html and odauth.js on your domain.
// - embed odauth.js in your app like this:
//	 <script id="odauth" src="odauth.js"
//					 clientId="YourClientId" scopes="ScopesYouNeed"
//					 redirectUri="YourUrlForCallback.html"></script>
// - define the onAuthenticated(token) function in your app to receive the auth token.
// - call odauth() to begin, as well as whenever you need an auth token
//	 to make an API call. if you're making an api call in response to a user's
//	 click action, call odAuth(true), otherwise just call odAuth(). the difference
//	 is that sometimes odauth needs to pop up a window so the user can sign in,
//	 grant your app permission, etc. the pop up can only be launched in response
//	 to a user click, otherwise the browser's popup blocker will block it. when
//	 odauth isn't called in click mode, it'll put a sign-in button at the top of
//	 your page for the user to click. when it's done, it'll remove that button.
//
// how it all works:
// when you call odauth(), we first check if we have the user's auth token stored
// in a cookie. if so, we read it and immediately call your onAuthenticated() method.
// if we can't find the auth cookie, we need to pop up a window and send the user
// to Microsoft Account so that they can sign in or grant your app the permissions
// it needs. depending on whether or not odauth() was called in response to a user
// click, it will either pop up the auth window or display a sign-in button for
// the user to click (which results in the pop-up). when the user finishes the
// auth flow, the popup window redirects back to your hosted callback.html file,
// which calls the onAuthCallback() method below. it then sets the auth cookie
// and calls your app's onAuthenticated() function, passing in the optional 'window'
// argument for the popup window. your onAuthenticated function should close the
// popup window if it's passed in.
//
// subsequent calls to odauth() will usually complete immediately without the
// popup because the cookie is still fresh.
function odauth(wasClicked) {
	ensureHttps();
	var token = getTokenFromCookie();
	if (token) {
		onAuthenticated(token);
	}
	else if (wasClicked) {
		challengeForAuth();
	}
	else {
		showLoginButton();
	}
}

// for added security we require https
function ensureHttps() {
/*
	if (window.location.protocol != "https:") {
		window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);
	}
*/
}

function onAuthCallback() {
	var authInfo = getAuthInfoFromUrl();
	var token = authInfo["access_token"];
	var expiry = parseInt(authInfo["expires_in"]);
	setCookie(token, expiry);
	window.opener.onAuthenticated(token, window);
}

function getAuthInfoFromUrl() {
	if (window.location.hash) {
		var authResponse = window.location.hash.substring(1);
		var authInfo = JSON.parse(
			'{"' + authResponse.replace(/&/g, '","').replace(/=/g, '":"') + '"}',
			function(key, value) { return key === "" ? value : decodeURIComponent(value); });
		return authInfo;
	}
	else {
		alert("failed to receive auth token");
	}
}

function getTokenFromCookie() {
	var cookies = document.cookie;
	var name = "odauth=";
	var start = cookies.indexOf(name);
	if (start >= 0) {
		start += name.length;
		var end = cookies.indexOf(';', start);
		if (end < 0) {
			end = cookies.length;
		}
		else {
			postCookie = cookies.substring(end);
		}

		var value = cookies.substring(start, end);
		return value;
	}

	return "";
}

function setCookie(token, expiresInSeconds) {
	var expiration = new Date();
	expiration.setTime(expiration.getTime() + expiresInSeconds * 1000);
	var cookie = "odauth=" + token +"; path=/; expires=" + expiration.toUTCString();

	if (document.location.protocol.toLowerCase() == "https") {
		cookie = cookie + ";secure";
	}

	document.cookie = cookie;
}

function getAppInfo() {
	var scriptTag = document.getElementById("odauth");
	if (!scriptTag) {
		alert("the script tag for odauth.js should have its id set to 'odauth'");
	}

	var clientId = scriptTag.getAttribute("clientId");
	if (!clientId) {
		alert("the odauth script tag needs a clientId attribute set to your application id");
	}

	var scopes = scriptTag.getAttribute("scopes");
	if (!scopes) {
		alert("the odauth script tag needs a scopes attribute set to the scopes your app needs");
	}

	var redirectUri = scriptTag.getAttribute("redirectUri");
	if (!redirectUri) {
		alert("the odauth script tag needs a redirectUri attribute set to your redirect landing url");
	}

	var appInfo = {
		"clientId": clientId,
		"scopes": scopes,
		"redirectUri": redirectUri
	};

	return appInfo;
}

// called when a login button needs to be displayed for the user to click on.
// if a customLoginButton() function is defined by your app, it will be called
// with 'true' passed in to indicate the button should be added. otherwise, it
// will insert a textual login link at the top of the page. if defined, your
// showCustomLoginButton should call challengeForAuth() when clicked.
function showLoginButton() {
	if (typeof showCustomLoginButton === "function") {
		showCustomLoginButton(true);
		return;
	}

	var loginText = document.createElement('a');
	loginText.href = "#";
	loginText.id = "loginText";
	loginText.onclick = challengeForAuth;
	loginText.innerText = "[sign in]";
	document.body.insertBefore(loginText, document.body.children[0]);
}

// called with the login button created by showLoginButton() needs to be
// removed. if a customLoginButton() function is defined by your app, it will
// be called with 'false' passed in to indicate the button should be removed.
// otherwise it will remove the textual link that showLoginButton() created.
function removeLoginButton() {
	if (typeof showCustomLoginButton === "function") {
		showCustomLoginButton(false);
		return;
	}

	var loginText = document.getElementById("loginText");
	if (loginText) {
		document.body.removeChild(loginText);
	}
}

function challengeForAuth() {
	var appInfo = getAppInfo();
	var url =
		"https://login.live.com/oauth20_authorize.srf" +
		"?client_id=" + appInfo.clientId +
		"&scope=" + encodeURIComponent(appInfo.scopes) +
		"&response_type=token" +
		"&redirect_uri=" + encodeURIComponent(appInfo.redirectUri);
	popup(url);
}

function popup(url) {
	var width = 525,
			height = 525,
			screenX = window.screenX,
			screenY = window.screenY,
			outerWidth = window.outerWidth,
			outerHeight = window.outerHeight;

	var left = screenX + Math.max(outerWidth - width, 0) / 2;
	var top = screenY + Math.max(outerHeight - height, 0) / 2;

	var features = [
							"width=" + width,
							"height=" + height,
							"top=" + top,
							"left=" + left,
							"status=no",
							"resizable=yes",
							"toolbar=no",
							"menubar=no",
							"scrollbars=yes"];
	var popup = window.open(url, "oauth", features.join(","));
	if (!popup) {
		alert("failed to pop up auth window");
	}

	popup.focus();
}

// ######


// odauth calls our onAuthenticated method to give us the user's auth token.
// in this demo app we just use this as the method to drive the page logic
function onAuthenticated(token, authWindow) {
	if (token) {
		if (authWindow) {
			removeLoginButton();
			authWindow.close();
		}

		(function($){
			// we extract the onedrive path from the url fragment and we
			// flank it with colons to use the api's path-based addressing scheme
			var path = "";
			var beforePath = "";
			var afterPath = "";
			if (window.location.hash) {
				path = window.location.hash.substr(1);
				beforePath =":";
				afterPath = ":";
			}

			var odurl = "https://api.onedrive.com/v1.0/drive/root" + beforePath + path + afterPath;
			var odquery = "?access_token=" + token;

			$.ajax({
				url: odurl + odquery,
				dataType: 'json',
				success: function(data) {
					if (data) {
						// clear out the old content
						$('#od-items').empty();
						$('#od-json').empty();

						// add the syntax-highlighted json response
						$("<pre>").html(syntaxHighlight(data)).appendTo("#od-json");

						// process the response data. if we get back children (data.children)
						// then render the tile view. otherwise, render the "one-up" view
						// for the item's individual data. we also look for children in
						// 'data.value' because if this app is ever configured to reqeust
						// '/children' directly instead of '/parent?expand=children', then
						// they'll be in an array called 'data'
						var decodedPath = decodeURIComponent(path);
						document.title = "1drv " + decodedPath;
						updateBreadcrumb(decodedPath);
						var children = data.children || data.value;
						if (children && children.length > 0) {
							$.each(children, function(i,item) {
								var tile = $("<div>").
									attr("href", "#" + path + "/" + encodeURIComponent(item.name)).
									addClass("item").
									click(function() {
										// when the page changes in response to a user click,
										// we set loadedForHash to the new value and call
										// odauth ourselves in user-click mode. this causes
										// the catch-all hashchange event handler not to
										// process the page again. see comment at the top.
										loadedForHash = $(this).attr('href');
										window.location = loadedForHash;
										odauth(true);
									}).
									appendTo("#od-items");

								// look for various facets on the items and style them accordingly
								if (item.folder) {
									tile.addClass("folder");
								}

								if (item.thumbnails && item.thumbnails.length > 0) {
									$("<img>").
										attr("src", item.thumbnails[0].c200x150_Crop.url).
										appendTo(tile);
								}

								$("<div>").
									addClass("nameplate").
									text(item.name).
									appendTo(tile);
							});
						}
						else {
							// 1-up view
							var tile = $("<div>").
								addClass("item").
								addClass("oneup").
								appendTo("#od-items");

							var downloadUrl = data['@content.downloadUrl'];
							if (downloadUrl) {
								tile.click(function(){window.location = downloadUrl;});
							}

							if (data.folder) {
								tile.addClass("folder");
							}

							if (data.thumbnails && data.thumbnails.length > 0) {
								$("<img>").
									attr("src", data.thumbnails[0].large.url).
									appendTo(tile);
							}
						}
					} else {
						$('#od-items').empty();
						$('<p>error.</p>').appendTo('#od-items');
						$('#od-json').empty();
					}
				}
			});
		})(jQuery);
	}
	else {
		alert("Error signing in");
	}
}

// start the whole thing off by calling odauth() in non-click mode.
// if the user isn't logged in already, a sign-in link will appear
// for them to click.
odauth();