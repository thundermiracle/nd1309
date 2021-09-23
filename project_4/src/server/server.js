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
const gas = 450000;
const ORACLE_PRICE = web3.utils.toWei("1", "ether");
const AIRLINE_FUND = web3.utils.toWei("10", "ether");
const FLIGHT_INFO = [
  [
    { flightNo: "NH6", flightTime: new Date("2021-03-24 09:00").getTime() },
    { flightNo: "NH106", flightTime: new Date("2021-03-24 10:00").getTime() },
    { flightNo: "NH211", flightTime: new Date("2021-03-24 19:00").getTime() },
  ],
  [
    { flightNo: "JAL0461", flightTime: new Date("2021-05-15 09:00").getTime() },
    { flightNo: "JAL0521", flightTime: new Date("2021-05-15 12:00").getTime() },
  ],
  [{ flightNo: "SKY0307", flightTime: new Date("2021-06-06 09:00").getTime() }],
  [{ flightNo: "SFJ0051", flightTime: new Date("2021-06-06 10:00").getTime() }],
  [{ flightNo: "ADO0067", flightTime: new Date("2021-06-06 11:00").getTime() }],
  [{ flightNo: "SNJ0097", flightTime: new Date("2021-06-06 12:00").getTime() }],
];

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

async function getAccounts() {
  const accounts = await web3.eth.getAccounts();

  // first one is owner
  const owner = accounts[0];

  // 2 ~ 7 -> airlines
  const airlines = accounts.slice(1, 7);

  // 8 ~ 13 -> passengers
  const passengers = accounts.slice(7, 13);

  // 14 ~ 34 -> oracles
  const oracles = accounts.slice(13, 33);

  return {
    owner,
    airlines,
    passengers,
    oracles,
  };
}

async function init() {
  try {
    const { owner, airlines, oracles } = await getAccounts();

    // authorize App
    await flightSuretyData.methods.authorizeCaller(config.appAddress).send({ from: owner, gas });

    // register airlines
    await initAirlines(airlines);

    // register flights
    await initFlights(airlines);

    // register oracle
    await initOracles(oracles);
  } catch (err) {
    console.error(err);
  }
}

async function registerAirline(newAirline, fromAirline) {
  const isRegistered = await flightSuretyData.methods.isAirlineRegistered(newAirline).call();
  if (!isRegistered) {
    await flightSuretyApp.methods.registerAirline(newAirline).send({ from: fromAirline, gas });
  }
  console.log(`[REGISTER(${newAirline})]: `, isRegistered);
}

async function fundAirline(newAirline) {
  const isFunded = await flightSuretyData.methods.isAirlineAvailable(newAirline).call();
  if (!isFunded) {
    await flightSuretyApp.methods
      .fundAirline()
      .send({ from: newAirline, value: AIRLINE_FUND, gas });
  }
  console.log(`[FUND(${newAirline})]: `, isFunded);
}

async function initAirlines(accounts) {
  const [firstAirline] = accounts;

  // As first airline is registered when deploying, fund 10 ether is needed only
  await fundAirline(firstAirline);

  // register first 3 airlines without consensus
  for (let index = 1; index < 4; index++) {
    const newAirline = accounts[index];
    await registerAirline(newAirline, firstAirline);
    await fundAirline(newAirline);
  }

  // register 4th ~6th with consensus
  for (let index = 4; index < accounts.length; index++) {
    const consensusCount = Math.ceil((index + 1) / 2);
    const newAirline = accounts[index];

    // vote airline for registration
    for (let consensusInd = 0; consensusInd < consensusCount; consensusInd++) {
      const registeredAirline = accounts[consensusInd];

      await registerAirline(newAirline, registeredAirline);
    }

    // fund
    await fundAirline(newAirline);
  }
}

async function initFlights(airlines) {
  for (let index = 0; index < airlines.length; index++) {
    const airline = airlines[index];
    const flights = FLIGHT_INFO[index];

    for (let fInd = 0; fInd < flights.length; fInd++) {
      const { flightNo, flightTime } = flights[fInd];
      const isFlightRegistered = await flightSuretyData.methods
        .isFlightRegistered(airline, flightNo, flightTime)
        .call();
      console.log(`[FLIGHT REGISTER](${airline}): `, flightNo, flightTime, isFlightRegistered);
      if (!isFlightRegistered) {
        await flightSuretyApp.methods
          .registerFlight(flightNo, flightTime)
          .send({ from: airline, gas });
      }
    }
  }
}

async function initOracles(accounts) {
  for (let index = 0; index < accounts.length; index++) {
    try {
      await flightSuretyApp.methods.registerOracle().send({
        from: accounts[index],
        value: ORACLE_PRICE,
        gas,
      });
      const indexes = await flightSuretyApp.methods.getMyIndexes().call({ from: accounts[index] });

      oracles[accounts[index]] = indexes;
      console.log(accounts[index], ":", indexes);
    } catch (err) {
      console.error("RegisterOracle Failed:", err.message);
    }
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
      const statusCode = generateRandomStatus();

      Object.entries(oracles).forEach(async ([oracleAddress, indexes]) => {
        if (indexes.includes(index)) {
          await flightSuretyApp.methods
            .submitOracleResponse(index, airlineAddress, flight, timestamp, statusCode)
            .send({ from: oracleAddress });

          console.log("OracleResponse Submitted:", airlineAddress, flight, timestamp, statusCode);
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
