// truffle exec mint.js --network rinkeby
const fs = require("fs");
const { initialize } = require("../node_modules/zokrates-js/node");
const solnSquareVerifier = require("./build/contracts/SolnSquareVerifier.json");

const MINT_COUNT = 10;

async function setup() {
  const accounts = await web3.eth.getAccounts();
  // 4: rinkeby
  const contract = new web3.eth.Contract(
    solnSquareVerifier.abi,
    solnSquareVerifier.networks[4].address
  );
  const code = fs.readFileSync("../zokrates/code/square/square.code").toString("utf-8");
  const provingKey = fs.readFileSync("../zokrates/code/square/proving.key");
  const zokratesProvider = await initialize();
  const artifacts = zokratesProvider.compile(code);

  return {
    account1: accounts[0],
    provingKey,
    zokratesProvider,
    artifacts,
    contractMethods: contract.methods,
  };
}

module.exports = async function mint(callback) {
  try {
    const { account1, provingKey, zokratesProvider, artifacts, contractMethods } = await setup();

    for (let index = 0; index < MINT_COUNT; index += 1) {
      console.log(`${index} -- mint token start...`);
      // generate proofs
      const { witness } = zokratesProvider.computeWitness(artifacts, [
        index.toString(),
        (index * index).toString(),
      ]);
      const proof = zokratesProvider.generateProof(artifacts.program, witness, provingKey);
      console.log(`${index} -- proof is generated`);

      // add resolution
      await contractMethods
        .addSolution(proof.proof.a, proof.proof.b, proof.proof.c, proof.inputs)
        .send({ from: account1 });
      console.log(`${index} -- solution is added`);

      // mint NFT
      await contractMethods
        .mintNFT(proof.proof.a, proof.proof.b, proof.proof.c, proof.inputs)
        .send({ from: account1 });
      console.log(`${index} -- mint token ended.`);
    }
  } catch (error) {
    console.log(error);
  }
  callback();
};
