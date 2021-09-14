// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
  using SafeMath for uint256;

  /********************************************************************************************/
  /*                                       DATA VARIABLES                                     */
  /********************************************************************************************/
  enum AirlineStatus {
    NONE, // default status
    REGISTERED, // Registered by available airline
    AVAILABLE // fund 10 ether after registered
  }

  struct Airline {
    AirlineStatus status;
    uint256 funds;
    uint256 votes;
    mapping(address => bool) votedAirlines;
  }

  address private contractOwner; // Account used to deploy contract
  bool private operational = true; // Blocks all state changes throughout the contract if false
  mapping(address => uint256) private authorizedContracts; // App Contracts which can call functions in this contract
  address[] private availableAirlines; // current available airlines
  mapping(address => Airline) private airlines;

  /********************************************************************************************/
  /*                                       EVENT DEFINITIONS                                  */
  /********************************************************************************************/
  event Received(address, uint256);

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

  function authorizeContact(address appContractAddress)
    external
    requireContractOwner
    requireIsOperational
    requireAddressValid(appContractAddress)
  {
    authorizedContracts[appContractAddress] = 1;
  }

  function deauthorizeContract(address appContractAddress)
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
  }

  function fundAirline(address airlineAddress, uint256 funds)
    external
    requireIsOperational
    requireCallerAuthorized
  {
    airlines[airlineAddress].funds = airlines[airlineAddress].funds.add(funds);
    airlines[airlineAddress].status = AirlineStatus.AVAILABLE;
  }

  /**
   * @dev Buy insurance for a flight
   *
   */
  function buy() external payable {}

  /**
   *  @dev Credits payouts to insurees
   */
  function creditInsurees() external pure {}

  /**
   *  @dev Transfers eligible payout funds to insuree
   *
   */
  function pay() external pure {}

  /**
   * @dev Initial funding for the insurance. Unless there are too many delayed flights
   *      resulting in insurance payouts, the contract should be self-sustaining
   *
   */
  function fund() public payable requireIsOperational {}

  function getFlightKey(
    address airline,
    string memory flight,
    uint256 timestamp
  ) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(airline, flight, timestamp));
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
