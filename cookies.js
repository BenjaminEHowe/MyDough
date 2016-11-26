function getCookie(key) {
  key += "=";
  var cookieArray = document.cookie.split(";");
  for(var i = 0; i < cookieArray.length; i++) {
    var cookie = cookieArray[i];
    if (cookie.indexOf(key) == 0) {
      return cookie.substring(key.length, cookie.length);
    }
  }
  return null;
};

function setCookie(key, value, path, hours) {
  var date = new Date();
  hours = hours || 2; // default to 2 hours
  date.setTime(+ date + (hours * 3600000)); // Get unix milliseconds at current time plus number of hours
  document.cookie = key + "=" + value + "; expires=" + date.toGMTString() + "; path=" + path;
  return;
};