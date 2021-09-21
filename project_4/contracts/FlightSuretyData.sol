// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
  using SafeMath for uint256;

  /********************************************************************************************/
  /*                                       DATA VARIABLES                                     */
  /********************************************************************************************/
  address private contractOwner; // Account used to deploy contract
  bool private operational = true; // Blocks all state changes throughout the contract if false
  mapping(address => uint256) private authorizedContracts; // App Contracts which can call functions in this contract

  enum AirlineStatus {
    NONE, // default status
    REGISTERED, // Registered by available airline
    AVAILABLE // fund 10 ether after registered
  }
  struct Airline {
    AirlineStatus status;
    uint256 funds;
    uint256 votes;
    uint256 insuranceReceived;
    uint256 insurancePaid;
    mapping(address => bool) votedAirlines;
  }
  address[] private availableAirlines; // current available airlines
  mapping(address => Airline) private airlines;

  // Flight status codees
  uint8 private constant STATUS_CODE_UNKNOWN = 0;
  uint8 private constant STATUS_CODE_ON_TIME = 10;
  uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
  uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
  uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
  uint8 private constant STATUS_CODE_LATE_OTHER = 50;
  struct Flight {
    address airline;
    string flight;
    uint256 timestamp;
    uint8 statusCode;
  }
  mapping(bytes32 => Flight) private flights;

  struct Insurance {
    address passenger;
    uint256 amount;
    bool isCredited;
  }
  mapping(bytes32 => Insurance[]) private flightInsurances;

  // 150%
  uint256 private constant COMPENSATION_FACTOR = 150;
  mapping(address => uint256) private passengerCompensations;

  /********************************************************************************************/
  /*                                       EVENT DEFINITIONS                                  */
  /********************************************************************************************/
  event Received(address, uint256);
  event AirlineRegistered(address);
  event AirlineFunded(address, uint256);
  event AirlineVoted(address, address, uint256);
  event InsuranceBought(address, string, uint256, address, uint256, bool);
  event FlightRegistered(address, string, uint256);
  event FlightStatusProcessed(address, string, uint256, uint8, bool, bool);
  event InsureeCredited(address, string, uint256, address, uint256);
  event CompensationWithdrawn(address, uint256);

  /**
   * @dev Constructor
   *      The deploying account becomes contractOwner
   */
  constructor(address airlineAddress) {
    contractOwner = msg.sender;

    // first airline
    airlines[airlineAddress].status = AirlineStatus.REGISTERED;
  }

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

  modifier requireCallerAuthorized() {
    require(authorizedContracts[msg.sender] == 1, "Caller is not authorized");
    _;
  }

  modifier requireAddressValid(address addr) {
    require(addr != address(0), "Must be a valid address.");
    _;
  }

  modifier requireAirlineAvailable(address addr) {
    require(airlines[addr].status == AirlineStatus.AVAILABLE, "Airline is not available");
    _;
  }

  /********************************************************************************************/
  /*                                       UTILITY FUNCTIONS                                  */
  /********************************************************************************************/

  /**
   * @dev Get operating status of contract
   *
   * @return A bool that is the current operating status
   */
  function isOperational() public view returns (bool) {
    return operational;
  }

  /**
   * @dev Sets contract operations on/off
   *
   * When operational mode is disabled, all write transactions except for this one will fail
   */
  function setOperatingStatus(bool mode) external requireContractOwner {
    operational = mode;
  }

  function authorizeCaller(address appContractAddress)
    external
    requireContractOwner
    requireIsOperational
    requireAddressValid(appContractAddress)
  {
    authorizedContracts[appContractAddress] = 1;
  }

  function deauthorizeCaller(address appContractAddress)
    external
    requireContractOwner
    requireIsOperational
    requireAddressValid(appContractAddress)
  {
    delete authorizedContracts[appContractAddress];
  }

  /********************************************************************************************/
  /*                                     STATUS CHECK FUNCTIONS                               */
  /********************************************************************************************/
  function isAirlineRegistered(address airlineAddress)
    external
    view
    requireIsOperational
    requireAddressValid(airlineAddress)
    returns (bool)
  {
    return airlines[airlineAddress].status != AirlineStatus.NONE;
  }

  function isAirlineAvailable(address airlineAddress)
    external
    view
    requireAddressValid(airlineAddress)
    returns (bool)
  {
    return airlines[airlineAddress].status == AirlineStatus.AVAILABLE;
  }

  function isAirlineVoted(address voteForAirlineAddress, address voteFromAirlineAddress)
    external
    view
    requireIsOperational
    requireAddressValid(voteForAirlineAddress)
    requireAddressValid(voteFromAirlineAddress)
    returns (bool)
  {
    return airlines[voteForAirlineAddress].votedAirlines[voteFromAirlineAddress];
  }

  function getAirlineVoteCount(address airlineAddress) external view returns (uint256) {
    return airlines[airlineAddress].votes;
  }

  function getAvailableAirlinesCount() external view returns (uint256) {
    return availableAirlines.length;
  }

  function getAirlineFunds(address airlineAddress) external view returns (uint256) {
    return airlines[airlineAddress].funds;
  }

  function isFlightRegistered(
    address airlineAddress,
    string memory flight,
    uint256 timestamp
  ) external view returns (bool) {
    bytes32 flightKey = getFlightKey(airlineAddress, flight, timestamp);
    Flight memory flightInfo = flights[flightKey];

    return flightInfo.airline != address(0);
  }

  function getInsuranceInfo(
    address airlineAddress,
    string memory flight,
    uint256 timestamp,
    address passenger
  ) external view returns (uint256 amount, bool isCredited) {
    bytes32 flightKey = getFlightKey(airlineAddress, flight, timestamp);
    Insurance[] memory allInsurances = flightInsurances[flightKey];

    for (uint256 ind = 0; ind < allInsurances.length; ind++) {
      if (allInsurances[ind].passenger == passenger) {
        return (allInsurances[ind].amount, allInsurances[ind].isCredited);
      }
    }

    return (0, false);
  }

  function getCompensationAmount(address passenger) external view returns (uint256) {
    return passengerCompensations[passenger];
  }

  /********************************************************************************************/
  /*                                     SMART CONTRACT FUNCTIONS                             */
  /********************************************************************************************/

  /**
   * @dev Add an airline to the registration queue
   *      Can only be called from FlightSuretyApp contract
   *
   */
  function registerAirline(address airlineAddress)
    external
    requireCallerAuthorized
    requireIsOperational
    requireAddressValid(airlineAddress)
  {
    airlines[airlineAddress].status = AirlineStatus.REGISTERED;

    emit AirlineRegistered(airlineAddress);
  }

  function voteAirline(address voteForAirlineAddress, address voteFromAirlineAddress)
    external
    requireCallerAuthorized
    requireIsOperational
    requireAddressValid(voteForAirlineAddress)
    requireAddressValid(voteFromAirlineAddress)
  {
    airlines[voteForAirlineAddress].votedAirlines[voteFromAirlineAddress] = true;
    airlines[voteForAirlineAddress].votes = airlines[voteForAirlineAddress].votes.add(1);

    emit AirlineVoted(
      voteForAirlineAddress,
      voteFromAirlineAddress,
      airlines[voteForAirlineAddress].votes
    );
  }

  function fundAirline(address airlineAddress, uint256 funds)
    external
    requireIsOperational
    requireCallerAuthorized
  {
    airlines[airlineAddress].funds = airlines[airlineAddress].funds.add(funds);
    airlines[airlineAddress].status = AirlineStatus.AVAILABLE;
    availableAirlines.push(airlineAddress);

    emit AirlineFunded(airlineAddress, airlines[airlineAddress].funds);
  }

  /**
   * @dev Buy insurance for a flight
   *
   */
  function buyInsurance(
    address airlineAddress,
    string memory flight,
    uint256 timestamp,
    address passenger,
    uint256 insuranceAmount
  ) external requireCallerAuthorized requireAddressValid(airlineAddress) {
    bytes32 flightKey = getFlightKey(airlineAddress, flight, timestamp);

    Insurance memory passengerInsurance = Insurance(passenger, insuranceAmount, false);
    flightInsurances[flightKey].push(passengerInsurance);

    emit InsuranceBought(
      airlineAddress,
      flight,
      timestamp,
      passengerInsurance.passenger,
      passengerInsurance.amount,
      passengerInsurance.isCredited
    );
  }

  /**
   * @dev Register a future flight for insuring.
   *
   */
  function registerFlight(
    address airlineAddress,
    string memory flight,
    uint256 timestamp
  ) external requireIsOperational requireCallerAuthorized requireAddressValid(airlineAddress) {
    bytes32 flightKey = getFlightKey(airlineAddress, flight, timestamp);
    flights[flightKey] = Flight({
      airline: airlineAddress,
      flight: flight,
      timestamp: timestamp,
      statusCode: STATUS_CODE_UNKNOWN
    });

    emit FlightRegistered(airlineAddress, flight, timestamp);
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
  ) external requireIsOperational requireCallerAuthorized {
    bytes32 flightKey = getFlightKey(airlineAddress, flight, timestamp);

    bool isStatusUpdated = false;
    bool isLateAirline = false;
    if (flights[flightKey].statusCode == STATUS_CODE_UNKNOWN) {
      isStatusUpdated = true;
      flights[flightKey].statusCode = statusCode;

      if (statusCode == STATUS_CODE_LATE_AIRLINE) {
        isLateAirline = true;
        creditInsurees(airlineAddress, flight, timestamp);
      }
    }

    emit FlightStatusProcessed(
      airlineAddress,
      flight,
      timestamp,
      statusCode,
      isStatusUpdated,
      isLateAirline
    );
  }

  /**
   *  @dev Credits payouts to insurees
   */
  function creditInsurees(
    address airlineAddress,
    string memory flight,
    uint256 timestamp
  ) internal requireIsOperational {
    bytes32 flightKey = getFlightKey(airlineAddress, flight, timestamp);
    Insurance[] memory insurances = flightInsurances[flightKey];

    for (uint256 index = 0; index < insurances.length; index++) {
      Insurance memory insurance = insurances[index];

      // get compensation price for every passenger who bought the insurance
      // compensation price = insuranceAmount * 150%
      uint256 compensationPrice = insurance.amount.mul(COMPENSATION_FACTOR).div(100);
      insurance.isCredited = true;

      // push all compensations to compensation info list
      passengerCompensations[insurance.passenger] = passengerCompensations[insurance.passenger].add(
        compensationPrice
      );

      // calculate total amount of compensations paid for late arrival
      airlines[airlineAddress].insurancePaid = airlines[airlineAddress].insurancePaid.add(
        compensationPrice
      );

      emit InsureeCredited(
        airlineAddress,
        flight,
        timestamp,
        insurance.passenger,
        compensationPrice
      );
    }
  }

  /**
   *  @dev Transfers eligible payout funds to insuree
   *
   */
  function pay(address passenger) external requireIsOperational requireCallerAuthorized {
    require(passengerCompensations[passenger] > 0, "No compensation is available for withdrawing");

    uint256 amount = passengerCompensations[passenger];
    passengerCompensations[passenger] = 0;

    payable(passenger).transfer(amount);

    emit CompensationWithdrawn(passenger, amount);
  }

  /**
   * @dev Initial funding for the insurance. Unless there are too many delayed flights
   *      resulting in insurance payouts, the contract should be self-sustaining
   *
   */
  function fund() public payable requireIsOperational {}

  function getFlightKey(
    address airlineAddress,
    string memory flight,
    uint256 timestamp
  ) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(airlineAddress, flight, timestamp));
  }

  /**
   * @dev Fallback function for funding smart contract.
   *
   */
  // fallback() external payable {
  //   fund();
  // }

  receive() external payable {
    fund();
    emit Received(msg.sender, msg.value);
  }
}
