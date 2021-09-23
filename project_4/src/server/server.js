import Web3 from "web3";
import express from "express";
import FlightSuretyData from "../../build/contracts/FlightSuretyData.json";
import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";

const config = Config["localhost"];
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace("http", "ws")));
web3.eth.defaultAccount = web3.eth.accounts[0];
const flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
const oracles = {};
const ORACLE_PRICE = web3.utils.toWei("1", "ether");

/**
 * random status code of
 * Unknown (0),
 * On Time (10),
 * Late Airline (20),
 * Late Weather (30),
 * Late Technical (40),
 * Late Other (50)
 */
function generateRandomStatus() {
  return Math.floor(Math.random() * 5.9) * 10;
}

async function init() {
  try {
    const accounts = await web3.eth.getAccounts();

    // authorize App
    await flightSuretyData.methods.authorizeCaller(config.appAddress);

    for (let index = 10; index < 30; index++) {
      try {
        await flightSuretyApp.methods.registerOracle().send({
          from: accounts[index],
          value: ORACLE_PRICE,
          gas: 4500000,
          gasPrice: 10000000000,
        });
        const indexes = await flightSuretyApp.methods
          .getMyIndexes()
          .call({ from: accounts[index] });

        oracles[accounts[index]] = indexes;
        console.log(accounts[index], ":", indexes);
      } catch (err) {
        console.error("RegisterOracle Failed:", err.message);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0,
  },
  function (error, event) {
    if (error) {
      console.error(error);
      return;
    }

    try {
      const { index, airlineAddress, flight, timestamp } = event.returnValues;
      Object.entries(oracles).forEach(async ([oracleAddress, indexes]) => {
        if (indexes.includes(index)) {
          await flightSuretyApp.methods
            .submitOracleResponse(index, airlineAddress, flight, timestamp, generateRandomStatus())
            .send({ from: oracleAddress });
        }
      });
    } catch (err) {
      console.log(err);
    }
  }
);

const app = express();

init().then(() => {
  app.get("/api", (req, res) => {
    res.send({
      message: "An API for use with your Dapp!",
    });
  });
});

export default app;
