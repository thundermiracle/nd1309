// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
  using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

  /********************************************************************************************/
  /*                                       DATA VARIABLES                                     */
  /********************************************************************************************/
  bool private operational = true;

  uint8 private constant REGISTERED_COUNT_NEED_CONSENSUS = 4;
  uint256 private constant MIN_FUND_VALUE = 10 ether;
  uint256 private constant MAX_INSURANCE_VALUE = 1 ether;

  FlightSuretyData flightSuretyData;

  address private contractOwner; // Account used to deploy contract

  struct Flight {
    bool isRegistered;
    uint8 statusCode;
    uint256 updatedTimestamp;
    address airlineAddress;
  }
  mapping(bytes32 => Flight) private flights;

  /********************************************************************************************/
  /*                                       FUNCTION MODIFIERS                                 */
  /********************************************************************************************/

  // Modifiers help avoid duplication of code. They are typically used to validate something
  // before a function is allowed to be executed.

  /**
   * @dev Modifier that requires the "operational" boolean variable to be "true"
   *      This is used on all state changing functions to pause the contract in
   *      the event there is an issue that needs to be fixed
   */
  modifier requireIsOperational() {
    // Modify to call data contract's status
    require(operational, "Contract is currently not operational");
    _; // All modifiers require an "_" which indicates where the function body will be added
  }

  /**
   * @dev Modifier that requires the "ContractOwner" account to be the function caller
   */
  modifier requireContractOwner() {
    require(msg.sender == contractOwner, "Caller is not contract owner");
    _;
  }

  modifier requireAirlineRegistered(address airlineAddress) {
    require(flightSuretyData.isAirlineRegistered(airlineAddress), "Airline is not registered");
    _;
  }

  modifier requireAirlineFunded(address airlineAddress) {
    require(flightSuretyData.isAirlineAvailable(airlineAddress), "Airline is not available");
    _;
  }

  modifier requireFlightNotRegistered(
    address airlineAddress,
    string memory flight,
    uint256 timestamp
  ) {
    require(
      !flightSuretyData.isFlightRegistered(airlineAddress, flight, timestamp),
      "Flight has already been registered"
    );
    _;
  }

  modifier requireFlightRegistered(
    address airlineAddress,
    string memory flight,
    uint256 timestamp
  ) {
    require(
      flightSuretyData.isFlightRegistered(airlineAddress, flight, timestamp),
      "Flight is not exist"
    );
    _;
  }

  /********************************************************************************************/
  /*                                       EVENTS                                             */
  /********************************************************************************************/
  event AirlineRegistered(uint256 count_);
  event AirlieFunded(address airlineAddress, uint256 funds);
  event InsuranceBought(
    address airlineAddress,
    string flight,
    uint256 timestamp,
    address passenger,
    uint256 amount
  );

  /********************************************************************************************/
  /*                                       CONSTRUCTOR                                        */
  /********************************************************************************************/

  /**
   * @dev Contract constructor
   *
   */
  constructor(address dataContract) {
    contractOwner = msg.sender;
    flightSuretyData = FlightSuretyData(dataContract);
  }

  /********************************************************************************************/
  /*                                       UTILITY FUNCTIONS                                  */
  /********************************************************************************************/

  function isOperational() public view returns (bool) {
    return operational; // Modify to call data contract's status
  }

  function setOperatingStatus(bool mode) external requireContractOwner {
    operational = mode;
  }

  /********************************************************************************************/
  /*                                     SMART CONTRACT FUNCTIONS                             */
  /********************************************************************************************/

  /**
   * @dev Add an airline to the registration queue
   *
   */
  function registerAirline(address targetAirlineAddress)
    external
    requireIsOperational
    requireAirlineFunded(msg.sender)
    returns (bool success, uint256 votes)
  {
    require(
      !flightSuretyData.isAirlineRegistered(targetAirlineAddress),
      "Airline is already registred"
    );

    // register directly if airlines' count is below 4
    if (flightSuretyData.getAvailableAirlinesCount() < REGISTERED_COUNT_NEED_CONSENSUS) {
      // vote is unnecessary
      flightSuretyData.registerAirline(targetAirlineAddress);
      emit AirlineRegistered(flightSuretyData.getAvailableAirlinesCount());
    } else {
      // consensus required when airlines' count is over 4
      require(
        !flightSuretyData.isAirlineVoted(targetAirlineAddress, msg.sender),
        "Airline is already voted"
      );

      // add votes
      flightSuretyData.voteAirline(targetAirlineAddress, msg.sender);
      if (
        flightSuretyData.getAirlineVoteCount(targetAirlineAddress) >=
        flightSuretyData.getAvailableAirlinesCount().div(2)
      ) {
        // register when votes > 50%
        flightSuretyData.registerAirline(targetAirlineAddress);
        emit AirlineRegistered(flightSuretyData.getAvailableAirlinesCount());
      }
    }

    return (
      flightSuretyData.isAirlineRegistered(targetAirlineAddress),
      flightSuretyData.getAirlineVoteCount(targetAirlineAddress)
    );
  }

  function fundAirline()
    external
    payable
    requireIsOperational
    requireAirlineRegistered(msg.sender)
  {
    require(msg.value >= MIN_FUND_VALUE, "At least 10 ether is required for funding");

    // transfer funds to Data contract
    address payable dataContract = payable(address(flightSuretyData));
    // dataContract.transfer(msg.value);
    (bool success, ) = dataContract.call{value: msg.value}("");
    require(success, "ether transfer failed");

    // make airline available after transfering funds
    flightSuretyData.fundAirline(msg.sender, msg.value);

    emit AirlieFunded(msg.sender, msg.value);
  }

  function buyInsurance(
    address airlineAddress,
    string memory flight,
    uint256 timestamp
  )
    external
    payable
    requireIsOperational
    requireAirlineFunded(airlineAddress)
    requireFlightRegistered(airlineAddress, flight, timestamp)
  {
    require(
      msg.value > 0 && msg.value <= MAX_INSURANCE_VALUE,
      "Insurance fee must be less than 1 ether"
    );

    // transfer funds to Data contract
    address payable dataContract = payable(address(flightSuretyData));
    // dataContract.transfer(msg.value);
    (bool success, ) = dataContract.call{value: msg.value}("");
    require(success, "ether transfer failed");

    flightSuretyData.buyInsurance(airlineAddress, flight, timestamp, msg.sender, msg.value);

    emit InsuranceBought(airlineAddress, flight, timestamp, msg.sender, msg.value);
  }

  function withdrawCompensation() external requireIsOperational {
    flightSuretyData.pay(msg.sender);
  }

  /**
   * @dev Register a future flight for insuring.
   *
   */
  function registerFlight(string memory flight, uint256 timestamp)
    external
    requireIsOperational
    requireAirlineFunded(msg.sender)
    requireFlightNotRegistered(msg.sender, flight, timestamp)
  {
    flightSuretyData.registerFlight(msg.sender, flight, timestamp);
  }

  /**
   * @dev Called after oracle has updated flight status
   *
   */
  function processFlightStatus(
    address airlineAddress,
    string memory flight,
    uint256 timestamp,
    uint8 statusCode
  ) internal requireIsOperational {
    flightSuretyData.processFlightStatus(airlineAddress, flight, timestamp, statusCode);
  }

  // Generate a request for oracles to fetch flight information
  function fetchFlightStatus(
    address airlineAddress,
    string memory flight,
    uint256 timestamp
  ) external {
    uint8 index = getRandomIndex(msg.sender);

    // Generate a unique key for storing the request
    bytes32 key = keccak256(abi.encodePacked(index, airlineAddress, flight, timestamp));
    ResponseInfo storage oracleResp = oracleResponses[key];
    oracleResp.requester = msg.sender;
    oracleResp.isOpen = true;

    emit OracleRequest(index, airlineAddress, flight, timestamp);
  }

  // region ORACLE MANAGEMENT

  // Incremented to add pseudo-randomness at various points
  uint8 private nonce = 0;

  // Fee to be paid when registering oracle
  uint256 public constant REGISTRATION_FEE = 1 ether;

  // Number of oracles that must respond for valid status
  uint256 private constant MIN_RESPONSES = 3;

  struct Oracle {
    bool isRegistered;
    uint8[3] indexes;
  }

  // Track all registered oracles
  mapping(address => Oracle) private oracles;

  // Model for responses from oracles
  struct ResponseInfo {
    address requester; // Account that requested status
    bool isOpen; // If open, oracle responses are accepted
    mapping(uint8 => address[]) responses; // Mapping key is the status code reported
    // This lets us group responses and identify
    // the response that majority of the oracles
  }

  // Track all oracle responses
  // Key = hash(index, flight, timestamp)
  mapping(bytes32 => ResponseInfo) private oracleResponses;

  // Event fired each time an oracle submits a response
  event FlightStatusInfo(address airlineAddress, string flight, uint256 timestamp, uint8 status);

  event OracleReport(address airlineAddress, string flight, uint256 timestamp, uint8 status);

  // Event fired when flight status request is submitted
  // Oracles track this and if they have a matching index
  // they fetch data and submit a response
  event OracleRequest(uint8 index, address airlineAddress, string flight, uint256 timestamp);

  // Register an oracle with the contract
  function registerOracle() external payable {
    // Require registration fee
    require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

    uint8[3] memory indexes = generateIndexes(msg.sender);

    oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
  }

  function getMyIndexes() external view returns (uint8[3] memory) {
    require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

    return oracles[msg.sender].indexes;
  }

  // Called by oracle when a response is available to an outstanding request
  // For the response to be accepted, there must be a pending request that is open
  // and matches one of the three Indexes randomly assigned to the oracle at the
  // time of registration (i.e. uninvited oracles are not welcome)
  function submitOracleResponse(
    uint8 index,
    address airlineAddress,
    string memory flight,
    uint256 timestamp,
    uint8 statusCode
  ) external requireIsOperational {
    require(
      (oracles[msg.sender].indexes[0] == index) ||
        (oracles[msg.sender].indexes[1] == index) ||
        (oracles[msg.sender].indexes[2] == index),
      "Index does not match oracle request"
    );

    bytes32 key = keccak256(abi.encodePacked(index, airlineAddress, flight, timestamp));
    require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

    oracleResponses[key].responses[statusCode].push(msg.sender);

    // Information isn't considered verified until at least MIN_RESPONSES
    // oracles respond with the *** same *** information
    emit OracleReport(airlineAddress, flight, timestamp, statusCode);
    if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {
      emit FlightStatusInfo(airlineAddress, flight, timestamp, statusCode);

      // Handle flight status as appropriate
      processFlightStatus(airlineAddress, flight, timestamp, statusCode);
    }
  }

  // Returns array of three non-duplicating integers from 0-9
  function generateIndexes(address account) internal returns (uint8[3] memory) {
    uint8[3] memory indexes;
    indexes[0] = getRandomIndex(account);

    indexes[1] = indexes[0];
    while (indexes[1] == indexes[0]) {
      indexes[1] = getRandomIndex(account);
    }

    indexes[2] = indexes[1];
    while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
      indexes[2] = getRandomIndex(account);
    }

    return indexes;
  }

  // Returns array of three non-duplicating integers from 0-9
  function getRandomIndex(address account) internal returns (uint8) {
    uint8 maxValue = 10;

    // Pseudo random number...the incrementing nonce adds variation
    uint8 random = uint8(
      uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue
    );

    if (nonce > 250) {
      nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
    }

    return random;
  }

  // endregion
}

abstract contract FlightSuretyData {
  // airlines
  function registerAirline(address airlineAddress) external virtual;

  function getAvailableAirlinesCount() external view virtual returns (uint256);

  function isAirlineRegistered(address airlineAddress) external view virtual returns (bool);

  function isAirlineAvailable(address airlineAddress) external view virtual returns (bool);

  function isAirlineVoted(address voteForAirlineAddress, address voteFromAirlineAddress)
    external
    view
    virtual
    returns (bool);

  function getAirlineVoteCount(address airlineAddress) external view virtual returns (uint256);

  function voteAirline(address voteForAirlineAddress, address voteFromAirlineAddress)
    external
    virtual;

  function fundAirline(address airlineAddress, uint256 funds) external virtual;

  // flights
  function isFlightRegistered(
    address airlineAddress,
    string memory flight,
    uint256 timestamp
  ) external virtual returns (bool);

  function registerFlight(
    address airlineAddress,
    string memory flight,
    uint256 timestamp
  ) external virtual;

  function processFlightStatus(
    address airlineAddress,
    string memory flight,
    uint256 timestamp,
    uint8 statusCode
  ) external virtual;

  function buyInsurance(
    address airlineAddress,
    string memory flight,
    uint256 timestamp,
    address passenger,
    uint256 insuranceAmount
  ) external virtual;

  function pay(address passenger) external virtual;
}
