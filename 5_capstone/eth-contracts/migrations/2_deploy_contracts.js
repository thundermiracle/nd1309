// migrating the appropriate contracts
const SquareVerifier = artifacts.require("./SquareVerifier.sol");
const SolnSquareVerifier = artifacts.require("./SolnSquareVerifier.sol");

const ERC721TokenRealEstate = artifacts.require("Erc721TokenRealEstate");

module.exports = async function (deployer) {
  await deployer.deploy(SquareVerifier);
  await deployer.deploy(SolnSquareVerifier, SquareVerifier.address);
  await deployer.deploy(ERC721TokenRealEstate);
};
