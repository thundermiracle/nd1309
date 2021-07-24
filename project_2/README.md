# Project2 of nd1309

A Star Notary project made with Smart Contract by Solidity.

## Information

1. Specify the Truffle version and OpenZeppelin version used in the project.

    ```
    Truffle@5.3.10
    @openzeppelin/contracts@4.1.0
    ```

1. Your ERC-721 Token Name

    `TM Star Notary`

1. Your ERC-721 Token Symbol

    `TMS`

1. Your “Token Address” on the Rinkeby Network

    Contract Token: `0x2a5e9380D5716a375Ce263A3f5571a753A5EaFCC`

## Installation

```bash
yarn
```

## Run

```bash
# first terminal: start truffle server (add `--network rinkeby` when deploy to rinkeby)
truffle compile && truffle test && truffle migrate
truffle develop

# second terminal: start web server
yarn dev
```
