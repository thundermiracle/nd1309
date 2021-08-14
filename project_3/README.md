# Project3 of nd1309

A SupplyChain project made with Smart Contract.

## Information

1. Token Address on the Rinkeby Network

   - Transaction Hash: `0x149f6df49bc7a29c333f7fbc20357ec8fd7085908912adecbf3101db85b75e9e`

     [https://rinkeby.etherscan.io/tx/0x149f6df49bc7a29c333f7fbc20357ec8fd7085908912adecbf3101db85b75e9e](https://rinkeby.etherscan.io/tx/0x149f6df49bc7a29c333f7fbc20357ec8fd7085908912adecbf3101db85b75e9e)

   - Contract Address: `0x139294B464EEadc0053FfABf0866b25bF7d41fbC`

     [https://rinkeby.etherscan.io/address/0x139294b464eeadc0053ffabf0866b25bf7d41fbc](https://rinkeby.etherscan.io/address/0x139294b464eeadc0053ffabf0866b25bf7d41fbc)

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
