const ERC721TokenRealEstate = artifacts.require("ERC721TokenRealEstate");

const makeUri = (tokenId) =>
  `https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/${tokenId}`;

contract("TestERC721Mintable", (accounts) => {
  const contractOwner = accounts[0];
  const account2 = accounts[1];
  const account3 = accounts[2];

  describe("match erc721 spec", function () {
    let contract;

    beforeEach(async function () {
      contract = await ERC721TokenRealEstate.new({ from: contractOwner });

      // TODO: mint multiple tokens
      await contract.mint(account2, 1, { from: contractOwner, gas: 450000 });
      await contract.mint(account2, 2, { from: contractOwner, gas: 450000 });
      await contract.mint(account2, 3, { from: contractOwner, gas: 450000 });
      await contract.mint(account3, 4, { from: contractOwner, gas: 450000 });
    });

    it("should return total supply", async function () {
      const total = await contract.totalSupply.call();

      assert.equal(total, 4, "total supply is not match");
    });

    it("should get token balance", async function () {
      const balanceOfAccount2 = await contract.balanceOf.call(account2);
      const balanceOfAccount3 = await contract.balanceOf.call(account3);

      assert.equal(balanceOfAccount2, 3, "balance of account1 is not match");
      assert.equal(balanceOfAccount3, 1, "balance of account2 is not match");
    });

    // token uri should be complete i.e: https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/1
    it("should return token uri", async function () {
      const uri1 = await contract.tokenURI.call(1);
      const uri2 = await contract.tokenURI.call(2);
      const uri3 = await contract.tokenURI.call(3);
      const uri4 = await contract.tokenURI.call(4);

      assert.equal(
        uri1,
        makeUri(1),
        "URI is not match to https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/{tokenId}"
      );
      assert.equal(
        uri1,
        makeUri(1),
        "URI is not match to https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/{tokenId}"
      );
      assert.equal(
        uri2,
        makeUri(2),
        "URI is not match to https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/{tokenId}"
      );
      assert.equal(
        uri3,
        makeUri(3),
        "URI is not match to https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/{tokenId}"
      );
      assert.equal(
        uri4,
        makeUri(4),
        "URI is not match to https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/{tokenId}"
      );
    });

    it("should transfer token from one owner to another", async function () {
      const ownerOfToken1Bef = await contract.ownerOf.call(1);
      assert.equal(ownerOfToken1Bef, account2, "owner of token 1 is not belonged to account2");

      // transfer token from account2 to account3
      await contract.transferFrom(account2, account3, 1, { from: account2, gas: 450000 });
      const ownerOfToken1Aft = await contract.ownerOf.call(1);
      assert.equal(ownerOfToken1Aft, account3, "owner of token 1 is not transferred to account3");
    });
  });

  describe("have ownership properties", function () {
    let contract;

    beforeEach(async function () {
      contract = await ERC721TokenRealEstate.new({ from: contractOwner });
    });

    it("should fail when minting when address is not contract owner", async function () {
      let errMsg;
      try {
        await contract.mint(account2, 1, { from: account2, gas: 450000 });
      } catch (err) {
        errMsg = err.message;
      }

      assert.equal(
        errMsg.includes("Only owner is allowed"),
        true,
        "Only contract owner mintable test failed"
      );
    });

    it("should return contract owner", async function () {
      const owner = await contract.getContractOwner.call();

      assert.equal(owner, contractOwner, "Contract owner is not correct");
    });
  });
});
