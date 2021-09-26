import Web3 from "web3";
import FlightSuretyData from "../../build/contracts/FlightSuretyData.json";
import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";

const ETHER_1 = Web3.utils.toWei("1", "ether");
export default class Contract {
  constructor(network, callback) {
    let config = Config[network];
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
    this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
    this.initialize(callback);
    this.owner = null;
    this.airlines = [];
    this.passengers = [];
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accounts) => {
      this.owner = accounts[0];

      let counter = 1;

      while (this.airlines.length < 5) {
        this.airlines.push(accounts[counter++]);
      }

      while (this.passengers.length < 5) {
        this.passengers.push(accounts[counter++]);
      }

      callback();
    });
  }

  isOperational(callback) {
    let self = this;
    self.flightSuretyApp.methods.isOperational().call({ from: self.owner }, callback);
  }

  fetchFlightStatus(airline, flight, timestamp, callback) {
    let self = this;
    let payload = {
      airline,
      flight,
      timestamp,
    };
    self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.owner }, (error, result) => {
        callback(error, payload);
      });
  }

  purchaseInsurance(airline, flight, timestamp, passenger, callback) {
    let self = this;
    let payload = {
      airline,
      flight,
      timestamp,
    };
    self.flightSuretyApp.methods
      .buyInsurance(payload.airline, payload.flight, payload.timestamp)
      .send({ from: passenger, value: ETHER_1, gas: 450000 }, (error, result) => {
        callback(error, payload);
      });
  }
}
