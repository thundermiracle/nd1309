// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// TODO define a contract call to the zokrates generated solidity contract <Verifier> or <renamedVerifier>
import "@openzeppelin/contracts/utils/Counters.sol";
import "./ERC721Mintable.sol";
import "./SquareVerifier.sol";

// TODO define another contract named SolnSquareVerifier that inherits from your ERC721Mintable class
contract SolnSquareVerifier is ERC721TokenRealEstate {
  using Counters for Counters.Counter;

  // TODO define a solutions struct that can hold an index & an address
  struct Solution {
    uint256 tokenId;
    address to;
    bool isVerified;
    bool isMinted;
  }

  SquareVerifier private verifier;

  // TODO define an array of the above struct
  Counters.Counter private solutionIndex;

  // TODO define a mapping to store unique solutions submitted
  mapping(bytes32 => Solution) private solutions;

  constructor(address _verifierAddress) ERC721TokenRealEstate() {
    verifier = SquareVerifier(_verifierAddress);
  }

  // TODO Create an event to emit when a solution is added
  event SolutionAdded(address to, uint256 tokenId);

  function getSolutionKey(
    uint256[2] memory a,
    uint256[2][2] memory b,
    uint256[2] memory c,
    uint256[2] memory input
  ) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(a, b, c, input));
  }

  // TODO Create a function to add the solutions to the array and emit the event
  function addSolution(
    uint256[2] memory a,
    uint256[2][2] memory b,
    uint256[2] memory c,
    uint256[2] memory input
  ) public withNotPaused {
    bytes32 solutionKey = getSolutionKey(a, b, c, input);
    require(solutions[solutionKey].to == address(0), "Solution is already exist");

    // verify input
    require(verifier.verifyTx(a, b, c, input), "Solution cannot be verified");

    // add to solutions
    Solution memory solution = Solution({
      tokenId: solutionIndex.current(),
      to: msg.sender,
      isVerified: true,
      isMinted: false
    });
    solutionIndex.increment();
    solutions[solutionKey] = solution;

    emit SolutionAdded(solution.to, solution.tokenId);
  }

  // TODO Create a function to mint new NFT only after the solution has been verified
  //  - make sure the solution is unique (has not been used before)
  //  - make sure you handle metadata as well as tokenSuplly
  function mintNFT(
    uint256[2] memory a,
    uint256[2][2] memory b,
    uint256[2] memory c,
    uint256[2] memory input
  ) public returns (bool) {
    bytes32 solutionKey = getSolutionKey(a, b, c, input);
    Solution memory solution = solutions[solutionKey];
    require(solution.isVerified, "Token is not verified");

    return mint(solution.to, solution.tokenId);
  }
}
