const ERC721TokenRealEstate = artifacts.require("ERC721TokenRealEstate");

const makeUri = (tokenId) =>
  `https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/${tokenId}`;

contract("TestERC721Mintable", (accounts) => {
  const contractOwner = accounts[0];
  const account2 = accounts[1];
  const account3 = accounts[2];
  const account4 = accounts[3];

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

    it("should transfer token from one owner to another by owner", async function () {
      const ownerOfToken1Bef = await contract.ownerOf.call(1);
      assert.equal(ownerOfToken1Bef, account2, "owner of token 1 is not belonged to account2");

      // transfer token from account2 to account3
      await contract.transferFrom(account2, account3, 1, { from: account2, gas: 450000 });
      const ownerOfToken1Aft = await contract.ownerOf.call(1);
      assert.equal(ownerOfToken1Aft, account3, "owner of token 1 is not transferred to account3");
    });

    it("should transfer token from one owner to another by approval", async function () {
      const ownerOfToken2Bef = await contract.ownerOf.call(2);
      assert.equal(ownerOfToken2Bef, account2, "owner of token 2 is not belonged to account2");

      // approve account3 to transfer tokenId 2
      await contract.approve(account4, 2, { from: account2, gas: 450000 });

      // transfer token from account2 to account3
      await contract.transferFrom(account2, account3, 2, { from: account4, gas: 450000 });
      const ownerOfToken2Aft = await contract.ownerOf.call(2);
      assert.equal(ownerOfToken2Aft, account3, "owner of token 2 is not transferred to account3");

      // approval should be disabled after the transfer is completed
      let errMsg;
      try {
        await contract.transferFrom(account3, account2, 2, { from: account4, gas: 450000 });
      } catch (err) {
        errMsg = err.message;
      }
      assert.equal(
        errMsg.includes("permission is required to transfer tokenId"),
        true,
        "approval should be used only once"
      );
    });
  });

  describe("exception check", function () {
    let contract;

    beforeEach(async function () {
      contract = await ERC721TokenRealEstate.new({ from: contractOwner });
      await contract.mint(account2, 1, { from: contractOwner, gas: 450000 });
      await contract.mint(account2, 2, { from: contractOwner, gas: 450000 });
    });

    it("tokenURI() should fail when tokenId is not minted", async function () {
      let errMsg;
      try {
        await contract.tokenURI.call(3);
      } catch (err) {
        errMsg = err.message;
      }

      assert.equal(
        errMsg.includes("token is not exist"),
        true,
        "tokenURI should not get returns as tokenId is not minted"
      );
    });

    it("token is not transferable without approval from the owner", async function () {
      let errMsg;
      try {
        await contract.safeTransferFrom(account2, account3, 1, { from: account3, gas: 450000 });
      } catch (err) {
        errMsg = err.message;
      }

      assert.equal(
        errMsg.includes("permission is required to transfer tokenId"),
        true,
        "token is not transferable without approval from the owner"
      );
    });

    it("token transfer is only allowed by the owner", async function () {
      let errMsg;
      try {
        await contract.approve(account3, 2, { from: account4, gas: 450000 });
      } catch (err) {
        errMsg = err.message;
      }

      assert.equal(
        errMsg.includes("Message sender must be the owner or has been approved by token owner"),
        true,
        "transferring of tokens should only be approved by the owner"
      );
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
