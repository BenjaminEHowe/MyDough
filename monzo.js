function getMonzo() {
  return {
    // general
    name: "Monzo Account",
    provider: "monzo",
    
    // auth
    authType: "oauth2",
    accessToken: null,
    accessExpires: -1,
    // variables below used while auth is being negotiated
    clientId: null,
    clientSecret: null,
    state: null,
    redirectUri: null,
    
    // other variables  
    accountId: null
  };
}
  
// auth functions
function monzoAuth(monzo) {
  if (monzo.clientId == null) {
    throw new Error("clientId isn't set and yet auth was called!");
  }
  if (monzo.clientSecret == null) {
    throw new Error("clientSecret isn't set and yet auth was called!");
  }
  if (monzo.state == null) {
    throw new Error("state isn't set and yet auth was called!");
  }
  if (monzo.redirectUri == null) {
    throw new Error("redirectUri isn't set and yet auth was called!");
  }
  window.location = "https://auth.getmondo.co.uk/?client_id=" + monzo.clientId + "&redirect_uri=" + monzo.redirectUri + "&response_type=code&state=" + monzo.state;
}

function monzoCallback(monzo, authCode) {
  if (monzo.clientId == null) {
    throw new Error("clientId isn't set and yet callback was called!");
  }
  if (monzo.clientSecret == null) {
    throw new Error("clientSecret isn't set and yet callback was called!");
  }
  if (monzo.state == null) {
    throw new Error("state isn't set and yet callback was called!");
  }
  if (monzo.redirectUri == null) {
    throw new Error("redirectUri isn't set and yet callback was called!");
  }

  var request = new XMLHttpRequest();
  request.open("POST", "https://api.monzo.com/oauth2/token", false);
  request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  request.send("grant_type=authorization_code&client_id=" + monzo.clientId + "&client_secret=" + monzo.clientSecret + "&redirect_uri=" + monzo.redirectUri + "&code=" + authCode);
  if (request.status == 200) {
    monzo.accessToken = JSON.parse(request.responseText).access_token;
    monzo.accessExpires = Date.now() + JSON.parse(request.responseText).expires_in * 1000;
    // clear the variables we were using while getting an access token
    delete monzo["clientId"];
    delete monzo["clientSecret"];
    delete monzo["redirectUri"];
    delete monzo["state"];
    // get the account id
    var request = new XMLHttpRequest();
    request.open("GET", "https://api.monzo.com/accounts", false);
    request.setRequestHeader("Authorization", "Bearer " + monzo.accessToken);
    request.send();
    monzo.accountId = JSON.parse(request.responseText).accounts[0];
  }
}

// HTML functions
function monzoTransactionHTML(monzo) {
  var HTML = "";
  HTML += "<h2>" + monzo.name + "</h2>";
  return HTML;
}

function monzoDetailsHTML(monzo) {
  var HTML = "";
  HTML += JSON.stringify(monzoGetBalance(monzo));
  return HTML;
}

// other functions
function monzoGetBalance(monzo) {
  var request = new XMLHttpRequest();
  request.open("GET", "https://api.monzo.com/balance?account_id=" + monzo.accountId, false);
  request.setRequestHeader("Authorization", "Bearer " + monzo.accessToken);
  request.send();
  return JSON.parse(request.responseText);
}