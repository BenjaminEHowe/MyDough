var monzo = {
  // general
  name: "Monzo Account",
  provider: "monzo",
  
  // auth
  authType: "oauth2",
  accessToken: "",
  accessExpires: -1,
  // variables below used while auth is being negotiated
  clientId = "",
  clientSecret = "",
  state = "",
  redirectUri = "",
  
  // auth functions
  auth: function() {
    if (clientId == "") {
      throw new Error("clientId isn't set and yet auth was called!");
    }
    if (clientSecret == "") {
      throw new Error("clientSecret isn't set and yet auth was called!");
    }
    if (state == "") {
      throw new Error("state isn't set and yet auth was called!");
    }
    if (redirectUri == "") {
      throw new Error("redirectUri isn't set and yet auth was called!");
    }
    window.location = "https://auth.getmondo.co.uk/?client_id=" + this.clientId + "&redirect_uri=" + this.redirectUri + "&response_type=code&state=" + this.state;
  },
  
  callback: function(authCode, state) {
    if (clientId == "") {
      throw new Error("clientId isn't set and yet callback was called!");
    }
    if (clientSecret == "") {
      throw new Error("clientSecret isn't set and yet callback was called!");
    }
    if (state == "") {
      throw new Error("state isn't set and yet callback was called!");
    }
    if (redirectUri == "") {
      throw new Error("redirectUri isn't set and yet callback was called!");
    }
    
    var request = new XMLHttpRequest();
    request.open("POST", "https://api.monzo.com/oauth2/token", false);
    request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    request.send("grant_type=authorization_code&client_id=" + this.clientId + "&client_secret=" + this.clientSecret + "&redirect_uri=" + this.redirectUri + "&code=" + authCode);
    if (request.status == 200) {
      this.accessToken = JSON.parse(request.responseText).access_token;
      this.accessExpires = Date.now() + JSON.parse(request.responseText).expires_in * 1000;
      // clear the variables we were using while getting an access token
      this.clientId = "";
      this.clientSecret = "";
      this.redirectUri = "";
      this.state = "";
    }
  }
  
  // other variables  
  accountId = "",
};