App = {
  web3Provider: null,
  contracts: {},
  emptyAddress: "0x0000000000000000000000000000000000000000",
  metamaskAccountID: "0x0000000000000000000000000000000000000000",
  data: {
    sku: 0,
    upc: 0,
    ownerID: "0x0000000000000000000000000000000000000000",
    originFarmerID: "0x0000000000000000000000000000000000000000",
    originFarmName: null,
    originFarmInformation: null,
    originFarmLatitude: null,
    originFarmLongitude: null,
    productNotes: null,
    productPrice: 0,
    distributorID: "0x0000000000000000000000000000000000000000",
    retailerID: "0x0000000000000000000000000000000000000000",
    consumerID: "0x0000000000000000000000000000000000000000",
  },

  init: async function () {
    App.readForm();
    /// Setup access to blockchain
    return await App.initWeb3();
  },

  readForm: function () {
    Object.keys(App.data).forEach((key) => {
      App.data[key] = $(`#${key}`).val();
    });
    console.log(App.data);
  },

  initWeb3: async function () {
    /// Find or Inject Web3 Provider
    /// Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.enable();
      } catch (error) {
        // User denied account access...
        console.error("User denied account access");
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider("http://localhost:9545");
    }

    App.getMetaskAccountID();

    return App.initSupplyChain();
  },

  getMetaskAccountID: function () {
    web3 = new Web3(App.web3Provider);

    // Retrieving accounts
    web3.eth.getAccounts(function (err, res) {
      if (err) {
        console.log("Error:", err);
        return;
      }
      console.log("getMetaskID:", res);
      App.metamaskAccountID = res[0];
    });
  },

  initSupplyChain: function () {
    /// Source the truffle compiled smart contracts
    var jsonSupplyChain = "SupplyChain.json";

    web3.eth.defaultAccount = web3.eth.accounts[0];

    /// JSONfy the smart contracts
    $.getJSON(jsonSupplyChain, function (data) {
      console.log("data", data);
      var SupplyChainArtifact = data;
      App.contracts.SupplyChain = TruffleContract(SupplyChainArtifact);
      App.contracts.SupplyChain.setProvider(App.web3Provider);

      App.refreshCoffeeInfo();
      App.fetchEvents();
    });

    return App.bindEvents();
  },

  bindEvents: function () {
    $("button").on("click", App.handleButtonClick);
    $("#upc").on("change", function (e) {
      App.refreshCoffeeInfo();
    });

    window.ethereum.on("accountsChanged", function (accounts) {
      App.metamaskAccountID = accounts[0];
    });
  },

  changeButtonToLoading: function (currentProcessId, loading) {
    if (loading) {
      $("#ftc-item").text("In operating...");
    } else if ($("#ftc-item").text() === "In operating...") {
      $("#ftc-item").text("No Result");
    }

    if (currentProcessId >= 9) {
      return;
    }

    // don't trigger when fetch data
    $("button").each(function () {
      const pID = parseInt($(this).data("id"));
      // Skip Fetch Data 1 & Fetch Data 2 buttons
      if (pID < 9) {
        const stateFinished = $(this).prop("class").includes("button-finished");
        $(this).prop("disabled", stateFinished || loading);
        if (loading) {
          $(this).addClass("button-disabled");
          pID === currentProcessId && $(this).addClass("button-loading");
        } else {
          $(this).removeClass("button-disabled");
          $(this).removeClass("button-loading");
        }
      }
    });
  },

  refreshCoffeeInfo: async function () {
    const upc = $("#upc").val();

    return App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return Promise.all([instance.fetchItemBufferOne(upc), instance.fetchItemBufferTwo(upc)]);
      })
      .then(function ([information1st, information2nd]) {
        console.log("result:", information1st, information2nd);
        const [
          {
            c: [sku],
          },
          {
            c: [upc],
          },
          ownerID,
          originFarmerID,
          originFarmName,
          originFarmInformation,
          originFarmLatitude,
          originFarmLongitude,
        ] = information1st;
        const [
          ,
          ,
          productID,
          productNotes,
          productPrice,
          {
            c: [itemState],
          },
          distributorID,
          retailerID,
          consumerID,
        ] = information2nd;

        if (upc === 0) {
          const inputtedSku = $("#sku").val();
          const inputtedUpc = $("#upc").val();

          // not exist, clear all except sku & upc
          $("input").each(function () {
            $(this).val("");
          });

          $("#sku").val(inputtedSku);
          $("#upc").val(inputtedUpc);
        } else {
          $("#sku").val(sku);
          $("#ownerID").val(ownerID);
          $("#originFarmerID").val(originFarmerID);
          $("#originFarmName").val(originFarmName);
          $("#originFarmInformation").val(originFarmInformation);
          $("#originFarmLatitude").val(originFarmLatitude);
          $("#originFarmLongitude").val(originFarmLongitude);
          $("#productID").val(productID);
          $("#productNotes").val(productNotes);
          $("#productPrice").val(productPrice);
          $("#itemState").val(itemState);
          $("#distributorID").val(distributorID);
          $("#retailerID").val(retailerID);
          $("#consumerID").val(consumerID);
        }

        App.readForm();

        $("button").each(function () {
          const pID = parseInt($(this).data("id"));
          if (itemState < pID) {
            $(this).prop("disabled", false);
            $(this).removeClass("button-finished");
          } else {
            $(this).prop("disabled", true);
            $(this).addClass("button-finished");
          }
        });
      })
      .catch(function (err) {
        console.log(err.message);
        throw err;
      });
  },

  handleButtonClick: async function (event) {
    event.preventDefault();

    const currentProcessId = parseInt($(event.target).data("id"));

    App.changeButtonToLoading(currentProcessId, true);
    App.readForm();

    try {
      switch (currentProcessId) {
        case 1:
          await App.harvestItem(event);
          break;
        case 2:
          await App.processItem(event);
          break;
        case 3:
          await App.packItem(event);
          break;
        case 4:
          await App.sellItem(event);
          break;
        case 5:
          await App.buyItem(event);
          break;
        case 6:
          await App.shipItem(event);
          break;
        case 7:
          await App.receiveItem(event);
          break;
        case 8:
          await App.purchaseItem(event);
          break;
        case 9:
          await App.fetchItemBufferOne(event);
          break;
        case 10:
          await App.fetchItemBufferTwo(event);
          break;
      }

      // refresh information
      if (currentProcessId < 9) await App.refreshCoffeeInfo();
    } finally {
      App.changeButtonToLoading(currentProcessId, false);
    }
  },

  harvestItem: async function (event) {
    return App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.harvestItem(
          App.data.upc,
          App.metamaskAccountID,
          App.data.originFarmName,
          App.data.originFarmInformation,
          App.data.originFarmLatitude,
          App.data.originFarmLongitude,
          App.data.productNotes
        );
      })
      .then(function (result) {
        $("#ftc-item").text(JSON.stringify(result));
        console.log("harvestItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
        throw err;
      });
  },

  processItem: async function (event) {
    return App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.processItem(App.data.upc, { from: App.metamaskAccountID });
      })
      .then(function (result) {
        $("#ftc-item").text(JSON.stringify(result));
        console.log("processItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
        throw err;
      });
  },

  packItem: async function (event) {
    return App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.packItem(App.data.upc, { from: App.metamaskAccountID });
      })
      .then(function (result) {
        $("#ftc-item").text(JSON.stringify(result));
        console.log("packItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
        throw err;
      });
  },

  sellItem: async function (event) {
    return App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        const productPrice = web3.toWei(1, "ether");
        console.log("productPrice", productPrice);
        return instance.sellItem(App.data.upc, App.data.productPrice, {
          from: App.metamaskAccountID,
        });
      })
      .then(function (result) {
        $("#ftc-item").text(JSON.stringify(result));
        console.log("sellItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
        throw err;
      });
  },

  buyItem: async function (event) {
    return App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        const walletValue = web3.toWei(3, "ether");
        return instance.buyItem(App.data.upc, { from: App.metamaskAccountID, value: walletValue });
      })
      .then(function (result) {
        $("#ftc-item").text(JSON.stringify(result));
        console.log("buyItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
        throw err;
      });
  },

  shipItem: async function (event) {
    return App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.shipItem(App.data.upc, { from: App.metamaskAccountID });
      })
      .then(function (result) {
        $("#ftc-item").text(JSON.stringify(result));
        console.log("shipItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
        throw err;
      });
  },

  receiveItem: async function (event) {
    return App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.receiveItem(App.data.upc, { from: App.metamaskAccountID });
      })
      .then(function (result) {
        $("#ftc-item").text(JSON.stringify(result));
        console.log("receiveItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
        throw err;
      });
  },

  purchaseItem: async function (event) {
    return App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.purchaseItem(App.data.upc, { from: App.metamaskAccountID });
      })
      .then(function (result) {
        $("#ftc-item").text(JSON.stringify(result));
        console.log("purchaseItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
        throw err;
      });
  },

  fetchItemBufferOne: async function () {
    return App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.fetchItemBufferOne(App.data.upc);
      })
      .then(function (result) {
        $("#ftc-item").text(JSON.stringify(result));
        console.log("fetchItemBufferOne", result);
      })
      .catch(function (err) {
        console.log(err.message);
        throw err;
      });
  },

  fetchItemBufferTwo: async function () {
    return App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.fetchItemBufferTwo.call(App.data.upc);
      })
      .then(function (result) {
        $("#ftc-item").text(JSON.stringify(result));
        console.log("fetchItemBufferTwo", result);
      })
      .catch(function (err) {
        console.log(err.message);
        throw err;
      });
  },

  fetchEvents: function () {
    if (typeof App.contracts.SupplyChain.currentProvider.sendAsync !== "function") {
      App.contracts.SupplyChain.currentProvider.sendAsync = function () {
        return App.contracts.SupplyChain.currentProvider.send.apply(
          App.contracts.SupplyChain.currentProvider,
          arguments
        );
      };
    }

    App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        var events = instance.allEvents(function (err, log) {
          if (!err)
            $("#ftc-events").append("<li>" + log.event + " - " + log.transactionHash + "</li>");
        });
      })
      .catch(function (err) {
        console.log(err.message);
        throw err;
      });
  },
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});
