# Udacity Blockchain Capstone

The capstone will build upon the knowledge you have gained in the course in order to build a decentralized housing product. 

## Contract Addresses

1. SquareVerifier
https://rinkeby.etherscan.io/address/0x85120EBa5198CfA8a5e023d9aa60E9B1D806d06A

1. ERC721TokenRealEstate
https://rinkeby.etherscan.io/address/0x0026E66239DbD4F7Abd30DDcAe7Fcb88E2e36eb8

1. SolnSquareVerifier
https://rinkeby.etherscan.io/address/0xb24CE882826Ee2f731C118cd307201fE9A08fcB3

## OpenSea

Account 1: https://testnets.opensea.io/thundermiracle-re

Account2: https://testnets.opensea.io/thundermiracle-2


## Version

| Package | Version |
|:------|:---------:|
| Solidity | 0.8.0 |
| nodejs | 12.19 |
| truffle | 5.4.11 |
| @openzeppelin/contracts | 4.3.2 |
| @truffle/hdwallet-provider | 1.5.0 |
| solc | 0.8.9 |
| solc-js | 1.0.1 |
| zokrates-js | 1.0.36 |

## How to use

### Install 

```shell
# install npm packages
yarn
```

### Settings

1. Create `.infuraKey` and add infura api key to it
1. Create `.secret` and add mnemonic to it

### Test & Deploy

```shell
# test contracts
cd eth-contracts
truffle test

# compile contracts
truffle compile

# migrate to rinkeby
truffle migrate --network rinkeby

# mint NFT (Automatically mint 10 NFT)
truffle exec mint.js --network rinkeby
```

## Project Resources

* [Remix - Solidity IDE](https://remix.ethereum.org/)
* [Visual Studio Code](https://code.visualstudio.com/)
* [Truffle Framework](https://truffleframework.com/)
* [Ganache - One Click Blockchain](https://truffleframework.com/ganache)
* [Open Zeppelin ](https://openzeppelin.org/)
* [Interactive zero knowledge 3-colorability demonstration](http://web.mit.edu/~ezyang/Public/graph/svg.html)
* [Docker](https://docs.docker.com/install/)
* [ZoKrates](https://github.com/Zokrates/ZoKrates)
