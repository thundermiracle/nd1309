var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");

contract("Flight Surety Tests", async (accounts) => {
  const ETHER_10 = web3.utils.toWei("10", "ether");
  const ETHER_1 = web3.utils.toWei("1", "ether");
  const CURRENT_TIME = Math.floor(Date.now() / 1000);

  const AIRLINE_2 = accounts[2];
  const AIRLINE_3 = accounts[3];
  const AIRLINE_4 = accounts[4];
  const AIRLINE_5 = accounts[5];

  const PASSENGER_1 = accounts[7];
  const PASSENGER_2 = accounts[8];

  let config;
  before("setup contract", async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    // Get operating status
    const status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSurety.setTestingMode(true);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it("(airline) cannot register an Airline using registerAirline() if it is not funded", async () => {
    // ACT
    try {
      await config.flightSuretyApp.registerAirline(AIRLINE_2, { from: config.firstAirline });
    } catch (e) {}
    let result = await config.flightSuretyData.isAirlineRegistered.call(AIRLINE_2);

    // ASSERT
    assert.equal(
      result,
      false,
      "Airline should not be able to register another airline if it hasn't provided funding"
    );
  });

  it("(airline) can register an Airline using registerAirline() after funded enough", async () => {
    // ACT
    await config.flightSuretyApp.fundAirline({
      from: config.firstAirline,
      value: ETHER_10,
      gasPrice: 0,
    });
    const firstAirlineFunds = await config.flightSuretyData.getAirlineFunds.call(
      config.firstAirline
    );
    assert.equal(firstAirlineFunds, ETHER_10, "Airline is not successfully funded");

    await config.flightSuretyApp.registerAirline(AIRLINE_2, { from: config.firstAirline });
    const isNewAirlineRegistered = await config.flightSuretyData.isAirlineRegistered.call(
      AIRLINE_2
    );

    // ASSERT
    assert.equal(
      isNewAirlineRegistered,
      true,
      "Airline should be able to register another airline if it has provided funding"
    );
  });

  it("(airline) consensus is required to registerAirline() after 4 airlines were available", async () => {
    /**************************************************************** */
    /* Register & fund 4 airlines */
    /**************************************************************** */
    // account[2] is already registered in the last test case
    await config.flightSuretyApp.fundAirline({
      from: AIRLINE_2,
      value: ETHER_10,
      gasPrice: 0,
    });

    await config.flightSuretyApp.registerAirline(AIRLINE_3, { from: config.firstAirline });
    await config.flightSuretyApp.fundAirline({
      from: AIRLINE_3,
      value: ETHER_10,
      gasPrice: 0,
    });

    await config.flightSuretyApp.registerAirline(AIRLINE_4, { from: config.firstAirline });
    await config.flightSuretyApp.fundAirline({
      from: AIRLINE_4,
      value: ETHER_10,
      gasPrice: 0,
    });

    // Register 5th airline
    await config.flightSuretyApp.registerAirline(AIRLINE_5, { from: config.firstAirline });
    const isAirline5Registered = await config.flightSuretyData.isAirlineRegistered.call(AIRLINE_5);

    // ASSERT
    assert.equal(
      isAirline5Registered,
      false,
      "Airline should not be able to be registered without consensus."
    );

    // Register 5th airline again to pass the consensus
    await config.flightSuretyApp.registerAirline(AIRLINE_5, { from: AIRLINE_2 });
    const isAirline5RegisteredAfterConsensus =
      await config.flightSuretyData.isAirlineRegistered.call(AIRLINE_5);

    assert.equal(
      isAirline5RegisteredAfterConsensus,
      true,
      "Airline should not be able to be registered after consensus pass."
    );
  });

  it("(insurance) can't buy insurance for airlines that are not funded", async () => {
    // try to buy insurance for airline which is not funded enough
    let errMsgBeforeAirlineFunded = "";
    try {
      await config.flightSuretyApp.buyInsurance(AIRLINE_5, "NH097", CURRENT_TIME, {
        from: AIRLINE_5,
        value: ETHER_1,
        gasPrice: 0,
      });
    } catch (e) {
      errMsgBeforeAirlineFunded = e.message;
    }
    assert.equal(
      errMsgBeforeAirlineFunded.includes("Airline is not available"),
      true,
      "Airline should be funded enough before provide insurance"
    );

    // ACT
    await config.flightSuretyApp.fundAirline({
      from: AIRLINE_5,
      value: ETHER_10,
      gasPrice: 0,
    });
    await config.flightSuretyApp.buyInsurance(AIRLINE_5, "NH097", CURRENT_TIME, {
      from: PASSENGER_2,
      value: ETHER_1,
      gasPrice: 0,
    });

    const { amount, paid } = await config.flightSuretyData.getInsuranceInfo.call(
      AIRLINE_5,
      "NH097",
      CURRENT_TIME,
      PASSENGER_2
    );

    // ASSERT
    assert.equal(amount, ETHER_1, "Insurance is bought successfully");
    assert.equal(paid, false, "Insurance is not paid");
  });
});
