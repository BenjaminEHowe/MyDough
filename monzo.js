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
    accountId: null,
    cardId: null
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
    monzo.accountId = JSON.parse(request.responseText).accounts[0].id;
    monzo.cardId = monzoGetCards(monzo).id;
  }
}

// HTML functions
function monzoTransactionHTML(monzo, id) {
  var HTML = "";
  HTML += "<h2>" + monzo.name + "</h2>";
  return HTML;
}

function monzoDetailsHTML(monzo, id) {
  var HTML = "";
  var balance = monzoGetBalance(monzo);
  var card = monzoGetCards(monzo);
  HTML += "<p>Welcome, " + card.name + "!</p>";
  HTML += "<p><strong>Balance: &pound;" + (balance.balance*0.01).toFixed(2) + "</strong></p>";
  HTML += "<p>You spent &pound;" + (balance.spend_today*0.01).toFixed(2) + " today.</p>";
  if (card.status == "ACTIVE") {
    HTML += "<p>Your card (last 4 digits " + card.last_digits + ") is currently active.<br />";
    HTML += '<a href="javascript:monzoFreezeCard(accounts[' + id + '], \'INACTIVE\', ' + id + ')">Freeze your card</a></p>';
  } else if (card.status == "INACTIVE") {
    HTML += "<p>Your card (last 4 digits " + card.last_digits + ") is currently frozen.<br />";
    HTML += '<a href="javascript:monzoFreezeCard(accounts[' + id + '], \'ACTIVE\', ' + id + ')">Defrost your card</a></p>';
  } else {
    HTML += "<p>Your card (last 4 digits " + card.last_digits + ") has unknown status!<br />";
  }
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

function monzoGetCards(monzo) {
  var request = new XMLHttpRequest();
  request.open("GET", "https://api.monzo.com/card/list?account_id=" + monzo.accountId, false);
  request.setRequestHeader("Authorization", "Bearer " + monzo.accessToken);
  request.send();
  return JSON.parse(request.responseText).cards[0];
}

function monzoFreezeCard(monzo, targetStatus, id) {
  var request = new XMLHttpRequest();
  request.open("PUT", "https://api.monzo.com/card/toggle?card_id=" + monzo.cardId + "&status=" + targetStatus, false);
  request.setRequestHeader("Authorization", "Bearer " + monzo.accessToken);
  request.send();
  document.getElementById("accountDetails").innerHTML = monzoDetailsHTML(monzo, id)
}