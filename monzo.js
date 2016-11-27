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
  // alasql  
  try {
    alasql("drop table transactions")
  } catch(err) {
    console.log(err.message);
  }
  alasql('CREATE TABLE transactions (' +
    'id STRING PRIMARY KEY,' +
    'created Date,' +
    'settled Date,' +
    'is_load BOOLEAN,' +
    'merchant_id STRING,' +
    'description STRING,' +
    'currency STRING,' +
    'amount DECIMAL(10,2),' +
    'account_balance DECIMAL(10,2),' +
    'notes STRING);');
  alasql('CREATE TABLE merchants (' +
    'id STRING PRIMARY KEY,' +
    'name STRING,' +
    'address STRING,' +
    'city STRING,' +
    'region STRING,' +
    'country STRING,' +
    'postcode STRING,' +
    'latitude DOUBLE PRECISION,' +
    'longitude DOUBLE PRECISION,' +
    'zoom_level INT,' +
    'created Date,' +
    'group_id STRING,' +
    'logo STRING,' +
    'emoji STRING,' +
    'category STRING);');
  
  transactions = monzoGetTransactions(monzo, true);
  for (var i = 0; i < transactions.length; i++) {
    var merchantId;
    if (transactions[i].merchant == null) {
      merchantId = null;
      if (transactions[i].is_load) {
        console.log("Found a transaction with no merchant, but it was a load...");
      } else {
        console.log("Found a transaction with no merchant - panic!")
      }
    } else {
      merchantId = transactions[i].merchant.id;
      if (alasql('SELECT id from merchants where id="' + merchantId + '"').length == 0) {
        // add merchant to alasql
        alasql('INSERT INTO merchants VALUES(' +
          '"' + transactions[i].merchant.id + '"' + ',' +
          '"' + transactions[i].merchant.name + '"' + ',' +
          '"' + transactions[i].merchant.address.address + '"' + ',' +
          '"' + transactions[i].merchant.address.city + '"' + ',' +
          '"' + transactions[i].merchant.address.region + '"' + ',' +
          '"' + transactions[i].merchant.address.country + '"' + ',' +
          '"' + transactions[i].merchant.address.postcode + '"' + ',' +
          transactions[i].merchant.address.latitude + ',' +
          transactions[i].merchant.address.longitude + ',' +
          transactions[i].merchant.address.zoom_level + ',' +
          '"' + transactions[i].merchant.created + '"' + ',' +
          '"' + transactions[i].merchant.group_id + '"' + ',' +
          '"' + transactions[i].merchant.logo + '"' + ',' +
          '"' + transactions[i].merchant.emoji + '"' + ',' +
          '"' + transactions[i].merchant.category + '");');
      }
    }
    alasql('INSERT INTO transactions VALUES(' +
      '"' + transactions[i].id + '"' + ',' +
      '"' + transactions[i].created + '"' + ',' +
      '"' + transactions[i].settled + '"' + ',' +
      transactions[i].is_load + ',' +
      '"' + merchantId + '"' + ',' +
      '"' + transactions[i].description + '"' + ',' +
      '"' + transactions[i].currency + '"' + ',' +
      transactions[i].amount / 100 + ',' +
      transactions[i].account_balance / 100 + ',' +
      '"' + transactions[i].notes + '"' + ');');
  }
  
  var HTML = "";
  HTML += "<h2>" + monzo.name + "</h2>";
  HTML += '<table id="transactions"></table>';
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

function monzoGetTransactions(monzo, expand) {
  if (typeof expand === "undefined") { expand = false; }
  var request = new XMLHttpRequest();
  if (expand) {
    request.open("GET", "https://api.monzo.com/transactions?account_id=" + monzo.accountId + "&expand[]=merchant", false);
  } else {
    request.open("GET", "https://api.monzo.com/transactions?account_id=" + monzo.accountId, false);
  }
  request.setRequestHeader("Authorization", "Bearer " + monzo.accessToken);
  request.send();
  return JSON.parse(request.responseText).transactions;  
}

function monzoFreezeCard(monzo, targetStatus, id) {
  var request = new XMLHttpRequest();
  request.open("PUT", "https://api.monzo.com/card/toggle?card_id=" + monzo.cardId + "&status=" + targetStatus, false);
  request.setRequestHeader("Authorization", "Bearer " + monzo.accessToken);
  request.send();
  document.getElementById("accountDetails").innerHTML = monzoDetailsHTML(monzo, id)
}