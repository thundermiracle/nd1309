const SolnSquareVerifier = artifacts.require("SolnSquareVerifier");
const SquareVerifier = artifacts.require("SquareVerifier");
const proof = require("../../zokrates/code/square/proof.json");

contract("TestSolnSquareVerifier", (accounts) => {
  const contractOwner = accounts[1];
  const account2 = accounts[2];
  const account3 = accounts[3];
  let contract;

  beforeEach(async function () {
    const verifierContract = await SquareVerifier.new({ from: contractOwner });
    contract = await SolnSquareVerifier.new(verifierContract.address, { from: contractOwner });
  });

  // Test if a new solution can be added for contract - SolnSquareVerifier
  it("solution is able to be added ", async () => {
    let eventEmitted = false;
    await contract.SolutionAdded(null, () => {
      eventEmitted = true;
    });

    await contract.addSolution(proof.proof.a, proof.proof.b, proof.proof.c, proof.inputs, {
      from: account2,
      gas: 450000,
    });

    assert.equal(eventEmitted, true, "solution is allowed to be added if it's been approved.");
  });

  it("solution cannot be duplicates", async () => {
    let errMsg = "";
    try {
      await contract.addSolution(proof.proof.a, proof.proof.b, proof.proof.c, proof.inputs, {
        from: account2,
        gas: 450000,
      });

      await contract.addSolution(proof.proof.a, proof.proof.b, proof.proof.c, proof.inputs, {
        from: account3,
        gas: 450000,
      });
    } catch (error) {
      errMsg = error.message;
    }

    assert.equal(
      errMsg.includes("Solution is already exist"),
      true,
      "solution is not allowed to be added when duplicated."
    );
  });

  it("solution cannot be add if proof is incorrect", async () => {
    let errMsg = "";
    try {
      const incorrectInputs = proof.inputs.map((input) => input.substr(0, input.length - 1) + "2");
      await contract.addSolution(proof.proof.a, proof.proof.b, proof.proof.c, incorrectInputs, {
        from: account2,
        gas: 450000,
      });
    } catch (error) {
      errMsg = error.message;
    }

    assert.equal(
      errMsg.includes("Solution cannot be verified"),
      true,
      "solution is not allowed to be added when proof is incorrect."
    );
  });

  // Test if an ERC721 token can be minted for contract - SolnSquareVerifier
  it("mintable after solution is added", async () => {
    await contract.addSolution(proof.proof.a, proof.proof.b, proof.proof.c, proof.inputs, {
      from: account2,
      gas: 450000,
    });

    const {
      receipt: { status },
    } = await contract.mintNFT(proof.proof.a, proof.proof.b, proof.proof.c, proof.inputs, {
      from: contractOwner,
      gas: 450000,
    });

    assert.equal(status, true, "should be mintable after solution is added.");

    const tokenURI = await contract.tokenURI.call(0);
    assert.equal(
      tokenURI,
      "https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/0",
      "URI is incorrect"
    );

    const ownerOfToken1 = await contract.ownerOf(0);
    assert.equal(ownerOfToken1, account2);
  });

  it("mintable not available before solution is added", async () => {
    let errMsg;
    try {
      const {
        receipt: { status },
      } = await contract.mintNFT(proof.proof.a, proof.proof.b, proof.proof.c, proof.inputs, {
        from: contractOwner,
        gas: 450000,
      });
    } catch (err) {
      errMsg = err.message;
    }

    assert.equal(
      errMsg.includes("Token is not verified"),
      true,
      "should not be mintable before solution is added."
    );
  });
});
