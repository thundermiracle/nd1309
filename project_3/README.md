# Project3 of nd1309

A SupplyChain project made with Smart Contract.

## Information

1. Token Address on the Rinkeby Network

   - Transaction Hash: `0x1146faae1eb9f952995c698ec76ed07c613102e5f048dce89320647f99b29808`

     [https://rinkeby.etherscan.io/tx/0x1146faae1eb9f952995c698ec76ed07c613102e5f048dce89320647f99b29808](https://rinkeby.etherscan.io/tx/0x1146faae1eb9f952995c698ec76ed07c613102e5f048dce89320647f99b29808)

   - Contract Address: `0x54689d0867fEd0C821F7d09C84579F5D639fDbE0`

     [https://rinkeby.etherscan.io/address/0x54689d0867fEd0C821F7d09C84579F5D639fDbE0](https://rinkeby.etherscan.io/address/0x54689d0867fEd0C821F7d09C84579F5D639fDbE0)

## Installation

```shell
yarn
```

Make `.infuraKey` and append infura key into it.

Make `.secret` and append secret key(words phrase) into it.

## Deployment

```shell
# first terminal
truffle develop

# second terminal
truffle compile && truffle test && truffle migrate --network rinkeby
```
