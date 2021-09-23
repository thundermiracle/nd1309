const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require("fs");

module.exports = function (deployer) {
  let firstAirline = "0xc1e07e06bdde797757ae50798f29cb2bf269bd58";
  deployer.deploy(FlightSuretyData, firstAirline).then(() => {
    return deployer.deploy(FlightSuretyApp, FlightSuretyData.address).then(() => {
      let config = {
        localhost: {
          url: "http://localhost:9545",
          dataAddress: FlightSuretyData.address,
          appAddress: FlightSuretyApp.address,
        },
      };
      fs.writeFileSync(
        __dirname + "/../src/dapp/config.json",
        JSON.stringify(config, null, "\t"),
        "utf-8"
      );
      fs.writeFileSync(
        __dirname + "/../src/server/config.json",
        JSON.stringify(config, null, "\t"),
        "utf-8"
      );
    });
  });
};
