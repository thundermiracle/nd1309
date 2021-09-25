const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require("fs");

module.exports = function (deployer) {
  let firstAirline = "0x2fbbb20f463bb1114c4e93e58f94843875d1921c";
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
