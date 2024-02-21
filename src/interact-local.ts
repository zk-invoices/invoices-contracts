import {
  Field,
  Mina,
  UInt32,
  PrivateKey,
  AccountUpdate,
  MerkleTree,
  Bool,
  Cache
} from 'o1js';
import { Invoice, InvoicesWitness } from './InvoicesModels.js';
import { Invoices } from './Invoices.js';

const doProofs = true;

async function run() {
  // we need the initiate tree root in order to tell the contract about our off-chain storage
  let initialCommitment: Field = Field(0);

  let Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
  Mina.setActiveInstance(Local);
  let initialBalance = 10_000_000_000;

  let feePayerKey = Local.testAccounts[0].privateKey;
  let feePayer = Local.testAccounts[0].publicKey;

  // the zkapp account
  let zkappKey = PrivateKey.random();
  let zkappAddress = zkappKey.toPublicKey();

  // we now need "wrap" the Merkle tree around our off-chain storage
  // we initialize a new Merkle Tree with height 8
  const Tree = new MerkleTree(32);

  // now that we got our accounts set up, we need the commitment to deploy our contract!
  initialCommitment = Tree.getRoot();

  let leaderboardZkApp = new Invoices(zkappAddress);
  console.log('Deploying leaderboard..');
  console.time();
  const cache: Cache = Cache.FileSystem("../../invoices-service/zkappcache");
  if (doProofs) {
    await Invoices.compile({ cache });
  }
  console.timeEnd();
  console.log('compiled');
  let tx = await Mina.transaction(feePayer, () => {
    AccountUpdate.fundNewAccount(feePayer).send({
      to: zkappAddress,
      amount: initialBalance,
    });
    leaderboardZkApp.deploy();
  });
  await tx.prove();
  await tx.sign([feePayerKey, zkappKey]).send();

  console.log(leaderboardZkApp.commitment.get().toString());
  console.log(Tree.getRoot().toString());

  let invoices = [];

  invoices.push(
    new Invoice({
      from: Local.testAccounts[1].publicKey,
      to: Local.testAccounts[1].publicKey,
      amount: UInt32.from(1),
      settled: Bool(false),
      metadataHash: Field(0),
    })
  );

  console.log('creating');
  await createInvoice(0n, invoices[0]);

  Tree.setLeaf(0n, invoices[0].hash());

  // console.log('settling');
  // await settleInvoice(0n, invoices[0]);

  // Tree.setLeaf(0n, invoices[0].settle().hash());

  console.log('commiting');
  await commit();

  console.log(leaderboardZkApp.commitment.get().toString());
  console.log(Tree.getRoot().toString());

  async function createInvoice(index: bigint, newInvoice: Invoice) {
    let w = Tree.getWitness(index);
    let witness = new InvoicesWitness(w);

    let tx = await Mina.transaction(feePayer, () => {
      leaderboardZkApp.createInvoice(newInvoice, witness);
    });
    await tx.prove();
    await tx.sign([feePayerKey, zkappKey]).send();
  }

  async function commit() {
    let tx = await Mina.transaction(feePayer, () => {
      leaderboardZkApp.commit();
    });
    await tx.prove();
    await tx.sign([feePayerKey, zkappKey]).send();
  }

  async function settleInvoice(index: bigint, invoice: Invoice) {
    let w = Tree.getWitness(index);
    let witness = new InvoicesWitness(w);

    let tx = await Mina.transaction(feePayer, () => {
      leaderboardZkApp.claimInvoice(invoice, witness);
    });
    await tx.prove();
    await tx.sign([feePayerKey, zkappKey]).send();
  }
}

run();