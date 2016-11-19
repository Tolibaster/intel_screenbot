var system = require('system');
var args = system.args;
var page = require('webpage').create();
var fs = require('fs');
var cookiespath = '.iced_cookies';
var config = '';
if (args.length === 1) {
    console.log('Try to pass some args when invoking this script!');
} else {
  if (args.length === 6){
      var SACSID  = args[1];
      var CSRF  = args[2];
      var IntelURL  = args[3];
      var filepath  = args[4];
      var plugins_file  = args[5];
      var search  = 'nix';
      var loginTimeout = '5000';
  }else{
    if (args.length === 7){
      var SACSID  = args[1];
      var CSRF  = args[2];
      var IntelURL  = args[3];
      var filepath  = args[4];
      var search  = args[5];
      var plugins_file  = args[6];
      var loginTimeout = '5000';
    }
  }
}

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function quit(err) {
  phantom.exit(0);
}
if (validateEmail(SACSID)) {
  loadCookies(function() {
    if (config.SACSID == undefined || config.SACSID == '') {
      firePlainLogin(SACSID, CSRF);
    } else {
      addCookies(config.SACSID, config.CSRF);
      console.log('Using cookies to log in');
      afterCookieLogin();
    }
  });
}else {
  addCookies(SACSID, CSRF);
  afterCookieLogin(IntelURL, search);
}

function loadCookies(callback) {
  if(fs.exists(cookiespath)) {
    var stream = fs.open(cookiespath, 'r');

    while(!stream.atEnd()) {
      var line = stream.readLine().split('=');
      if(line[0] === 'SACSID') {
        config.SACSID = line[1];
      } else if(line[0] === 'csrftoken') {
        config.CSRF = line[1];
      } else {
        config.SACSID = '';
        config.CSRF = '';
      }
    }
    stream.close();
  }
  callback();
}

function isSignedIn() {
  return page.evaluate(function() {
    return document.getElementsByTagName('a')[0].innerText.trim() !== 'Sign in';
  });
}

function storeCookies() {
  var cookies = page.cookies;
  fs.write(cookiespath, '', 'w');
  for(var i in cookies) {
    fs.write(cookiespath, cookies[i].name + '=' + cookies[i].value +'\n', 'a');
  }
}

function firePlainLogin(SACSID, CSRF) {
  page.open('https://www.ingress.com/intel', function (status) {
    page.evaluate(function () {
      localStorage.clear()
    });
    if (status !== 'success') {quit('unable to connect to remote server')}
    var link = 'https://www.google.com/accounts/ServiceLogin?service=ah&passive=true&continue=https://appengine.google.com/_ah/conflogin%3Fcontinue%3Dhttps://www.ingress.com/intel&ltmpl='
    page.open(link, function () {
      login(SACSID, CSRF);
    });
  });
}

function login(l, p) {
    if (document.querySelector('#timeoutError')){
        login(l, p)
        firePlainLogin(l, p)
    }
    waitFor({
        timeout: loginTimeout*2,
        check: function () {
            return page.evaluate(function() {
                if (document.querySelector('#gaia_loginform')) {
                    return true;
                }else{
                    return false;
                }
            });
        },
        success: function () {
            page.evaluate(function (l) {
                document.getElementById('Email').value = l;
            }, l);
            page.evaluate(function () {
                document.querySelector("#next").click();
            });
            window.setTimeout(function () {
                page.evaluate(function (p) {
                    document.getElementById('Passwd').value = p;
                }, p);
                if(document.querySelector("#next")){
                    page.evaluate(function () {
                        document.querySelector("#next").click();
                    });
                }else{
                    page.evaluate(function () {
                        document.querySelector("#signIn").click();
                    });
                }
                window.setTimeout(function () {
                    if (page.url.substring(0,40) === 'https://accounts.google.com/ServiceLogin') {
                        quit('login failed: wrong email and/or password');
                    }

                    if (page.url.substring(0,40) === 'https://appengine.google.com/_ah/loginfo') {
                        page.evaluate(function () {
                            document.getElementById('persist_checkbox').checked = true;
                            document.getElementsByTagName('form').submit();
                        });
                    }

                    if (page.url.substring(0,44) === 'https://accounts.google.com/signin/challenge') {
                        twostep = system.stdin.readLine();
                    }
                    window.setTimeout(afterPlainLogin(IntelURL, search), loginTimeout);
                }, loginTimeout)
            }, loginTimeout / 10);
        },
        error: function () {
            quit();
        }
    });
}

function afterPlainLogin(IntelURL, search) {
  page.viewportSize = { width: '1280', height: '720' };
  page.open(IntelURL, function(status) {
    if (status !== 'success') {quit('unable to connect to remote server')}
    if (!isSignedIn()) {
      console.log("not logged in")
      quit();
    }
    setTimeout(function() {
		setupIITC()
        setTimeout(function() {
          setTimeout(function() {if (search != "nix") {searchfunc(search);}}, 1000);
            waitFor({
                timeout: 240000,
                check: function () {
                    return page.evaluate(function() {
                        if (document.querySelector('.map').textContent.indexOf('done') != -1) {
                            return true;
                        }else{
                            console.log('generateFakeOutput')
                            return false;
                        }
                    });
                },
                success: function () {
                  var startTime = new Date().getTime();
                  var interval = setInterval(function(){
                    if(new Date().getTime() - startTime > 5000){
                      hideDebris();
                      prepare('1280', '720');
                      main();
                      clearInterval(interval);
                      return;
                    }
                    console.log('generateFakeOutput')
                  }, 1000);
                },
                error: function () {
                  var startTime = new Date().getTime();
                  var interval = setInterval(function(){
                    if(new Date().getTime() - startTime > 5000){
                      hideDebris();
                      prepare('1280', '720');
                      main();
                      clearInterval(interval);
                      return;
                    }
                    console.log('generateFakeOutput')
                  }, 1000);
                }
            });
        }, "1000");
    }, "1000");
  });
}



function addCookies(sacsid, csrf) {
  phantom.addCookie({
    name: 'SACSID',
    value: sacsid,
    domain: 'www.ingress.com',
    path: '/',
    httponly: true,
    secure: true
  });
  phantom.addCookie({
    name: 'csrftoken',
    value: csrf,
    domain: 'www.ingress.com',
    path: '/'
  });
}


function waitFor ($config) {
    $config._start = $config._start || new Date();
    if ($config.timeout && new Date - $config._start > $config.timeout) {
        if ($config.error) $config.error();
        return;
    }
    if ($config.check()) {
        return $config.success();
    }
    setTimeout(waitFor, $config.interval || 0, $config);
}

function loadIitcPlugin(src) {
  page.evaluate(function(src) {
    var script = document.createElement('script');
    script.type='text/javascript';
    script.src=src;
    document.head.insertBefore(script, document.head.lastChild);
  }, src);
}

function loadLocalIitcPlugin(src) {
    page.injectJs(src)
}

function afterCookieLogin(IntelURL, search) {
  page.viewportSize = { width: '1280', height: '720' };
  page.open(IntelURL, function(status) {
    if (status !== 'success') {quit('unable to connect to remote server')}
    if(!isSignedIn()) {
      if(fs.exists(cookiespath)) {
        fs.remove(cookiespath);
      }
      if(validateEmail(SACSID)) {
        page.deleteCookie('SACSID');
        page.deleteCookie('csrftoken');
        firePlainLogin(SACSID, CSRF);
        return;
      } else {
        quit('Cookies are obsolete. Update your config file.');
      }
    }
    setTimeout(function() {
    	setupIITC()
        setTimeout(function() {
          if (search != "nix") {searchfunc(search);}
            waitFor({
                timeout: 240000,
                check: function () {
                    return page.evaluate(function() {
                        if (document.querySelector('.map').textContent.indexOf('done') != -1) {
                            return true;
                        }else{
                            console.log('generateFakeOutput')
                            return false;
                        }
                    });
                },
                success: function () {
                  var startTime = new Date().getTime();
                  var interval = setInterval(function(){
                    if(new Date().getTime() - startTime > 5000){
                      hideDebris();
                      prepare('1280', '720');
                      main();
                      clearInterval(interval);
                      return;
                    }
                    console.log('generateFakeOutput')
                  }, 1000);
                },
                error: function () {
                  var startTime = new Date().getTime();
                  var interval = setInterval(function(){
                    if(new Date().getTime() - startTime > 5000){
                      hideDebris();
                      prepare('1280', '720');
                      main();
                      clearInterval(interval);
                      return;
                    }
                    console.log('generateFakeOutput')
                  }, 1000);
                }
            });
        }, "1000");
    }, "1000");
  });
}

function searchfunc(search){
  page.evaluate(function(search) {
    if (document.querySelector('#search')){
        window.addHook('search', function(query) {
          var checkExist = setInterval(function() {
            if (query.results.length > 0) {
              console.warn(query.results)
              map.fitBounds(query.results[0].bounds, {maxZoom: 17})
              clearInterval(checkExist);
            }
          }, 100);
        });
      setTimeout(function() {
        window.search.doSearch(search, true)
      }, 2000);
    }
  }, search);
}

function setupIITC(){
    loadIitcPlugin('https://static.iitc.me/build/release/plugins/canvas-render.user.js');
    page.evaluate(function() {
        localStorage['ingress.intelmap.layergroupdisplayed'] = JSON.stringify({
          "Unclaimed Portals": true,
          "Level 1 Portals": true,
          "Level 2 Portals": true,
          "Level 3 Portals": true,
          "Level 4 Portals": true,
          "Level 5 Portals": true,
          "Level 6 Portals": true,
          "Level 7 Portals": true,
          "Level 8 Portals": true,
		      "Fields": true,
		      "Links": true,
		      "Resistance": true,
		      "Enlightened": true,
          "DEBUG Data Tiles":false,
          "Artifacts":true,
          "Ornaments":true
        });
        var script = document.createElement('script');
        script.type='text/javascript';
        script.src='https://static.iitc.me/build/test/total-conversion-build.user.js';
        document.head.insertBefore(script, document.head.lastChild);
    	localStorage['iitc-base-map'] = 'Google Roads';
    });
    var plugins = JSON.parse(fs.read(plugins_file));
    for(var i in plugins){
        var plugin = plugins[i];
        if(plugin.match('^[a-zA-Z]+://')){
            loadIitcPlugin(plugin);
        }else{
           loadLocalIitcPlugin(plugin);
        }
    }
}

function s(file) {
  console.log('SCREENSHOT')
  page.render(file);
  var startTime = new Date().getTime();
  var startTime = new Date().getTime();
  var interval = setInterval(function(){
    if(new Date().getTime() - startTime > 5000){
      clearInterval(interval);
      phantom.exit(0);
      return;
    }
    console.log('doSomeOutput')
  }, 1000);
}

function hideDebris() {
  window.setTimeout(function() {
    page.evaluate(function() {
      if (document.querySelector('#chat'))                      {document.querySelector('#chat').style.display = 'none';}
      if (document.querySelector('#chatcontrols'))              {document.querySelector('#chatcontrols').style.display = 'none';}
      if (document.querySelector('#chatinput'))                 {document.querySelector('#chatinput').style.display = 'none';}
      if (document.querySelector('#updatestatus'))              {document.querySelector('#updatestatus').style.display = 'none';}
      if (document.querySelector('#sidebartoggle'))             {document.querySelector('#sidebartoggle').style.display = 'none';}
      if (document.querySelector('#scrollwrapper'))             {document.querySelector('#scrollwrapper').style.display = 'none';}
      if (document.querySelector('.leaflet-control-container')) {document.querySelector('.leaflet-control-container').style.display = 'none';}
      if (document.querySelector('#portal_highlight_select')) {document.querySelector('#portal_highlight_select').style.display = 'none';}
    });
  }, 200);
}

function prepare(widthz, heightz) {
    window.setTimeout(function() {
        page.evaluate(function(w, h) {
            var water = document.createElement('p');
            water.id='viewport-ice';
            water.style.position = 'absolute';
            water.style.top = '0';
            water.style.marginTop = '0';
            water.style.paddingTop = '0';
            water.style.left = '0';
            water.style.width = w + 'px';
            water.style.height = h + 'px';
            document.querySelectorAll('body')[0].appendChild(water);
        }, widthz, heightz);
        var selector = "#viewport-ice";
        setElementBounds(selector);
    }, 500);
}


function setElementBounds(selector) {
  page.clipRect = page.evaluate(function(selector) {
    var clipRect = document.querySelector(selector).getBoundingClientRect();
    return {
      top:    clipRect.top,
      left:   clipRect.left,
      width:  clipRect.width,
      height: clipRect.height
    };
  }, selector);
}

function getDateTime(format) {
  var now     = new Date();
  var year    = now.getFullYear();
  var month   = now.getMonth()+1;
  var day     = now.getDate();
  var hour    = now.getHours();
  var minute  = now.getMinutes();
  var second  = now.getSeconds();
  var timeZone = '';
  if(month.toString().length === 1) {
    month = '0' + month;
  }
  if(day.toString().length === 1) {
    day = '0' + day;
  }
  if(hour.toString().length === 1) {
    hour = '0' + hour;
  }
  if(minute.toString().length === 1) {
    minute = '0' + minute;
  }
  if(second.toString().length === 1) {
    second = '0' + second;
  }
  var dateTime;
  if (format === 1) {
    dateTime = year + '-' + month + '-' + day + '--' + hour + '-' + minute + '-' + second;
  } else {
    dateTime = day + '.' + month + '.' + year + ' ' + hour + ':' + minute + ':' + second + timeZone;
  }
  return dateTime;
}

function addTimestamp(time) {
  page.evaluate(function(dateTime, search) {
    var water = document.createElement('p');
    water.id='watermark-ice';
    water.innerHTML = dateTime + ' - ' + search;
    water.style.position = 'absolute';
    water.style.color = '#3A539B';
    water.style.top = '0';
    water.style.zIndex = '4404';
    water.style.marginTop = '0';
    water.style.paddingTop = '0';
    water.style.left = '0';
    water.style.fontSize = '40px';
    water.style.opacity = '0.8';
    water.style.fontFamily = 'monospace';
    water.style.textShadow = '0px 1px 8px rgba(150, 150, 150, 1)';
    document.querySelectorAll('body')[0].appendChild(water);
  }, time, search);
}

/**
 * Main function.
 */
function main() {
  page.evaluate(function() {
    if (document.getElementById('watermark-ice')) {
      var oldStamp = document.getElementById('watermark-ice');
      oldStamp.parentNode.removeChild(oldStamp);
    }
  });
  window.setTimeout(function() {
    addTimestamp(getDateTime(0));
    file = filepath;
    s(file);
  }, 400);
}