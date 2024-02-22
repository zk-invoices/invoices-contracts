import fs from 'fs/promises';
import { Bool, Field, MerkleTree, Mina, PrivateKey, UInt32, fetchAccount } from 'o1js';
import { Invoice, InvoicesWitness } from '../InvoicesModels.js';
import { Invoices } from '../Invoices.js';
import { InvoicesProviderToken as InvoicesProvider } from '../InvoicesProviderToken.js';

// check command line arg
let deployAlias = process.argv[2],
  userKeyStr = process.argv[3];

if (!deployAlias)
  throw Error(`Missing <deployAlias> argument.

Usage:
node build/src/actions/<scriptName>.js <deployAlias> <userPrivateKey>
`);
Error.stackTraceLimit = 1000; 

// parse config and private key from file
type Config = {
  deployAliases: Record<
    string,
    {
      url: string;
      keyPath: string;
      fee: string;
      feepayerKeyPath: string;
      feepayerAlias: string;
    }
  >;
};
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.deployAliases[deployAlias];
let feepayerKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.feepayerKeyPath, 'utf8')
);

let zkAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

let feepayerKey = PrivateKey.fromBase58(feepayerKeysBase58.privateKey);
let zkAppKey = PrivateKey.fromBase58(zkAppKeysBase58.privateKey);

console.log('zkApp Address', zkAppKey.toPublicKey().toBase58());

// set up Mina instance and contract we interact with
const Network = Mina.Network({
  mina: config.url,
  archive: 'https://archive.berkeley.minaexplorer.com'
});
const fee = Number(config.fee) * 1e9 * 5; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
let feepayerAddress = feepayerKey.toPublicKey();
let zkAppAddress = zkAppKey.toPublicKey();

const userKey = PrivateKey.fromBase58(userKeyStr);
const userAddress = userKey.toPublicKey();

let zkApp = new InvoicesProvider(zkAppAddress);

let sentTx;
// compile the contract to create prover keys
console.log('compile the contract...');

await InvoicesProvider.compile();
await Invoices.compile();

try {
  // call update() and send transaction
  console.log('build transaction and create proof...');

  const Tree = new MerkleTree(32);
  const invoicesZkApp = new Invoices(userAddress, zkApp.token.id);

  await fetchAccount({ publicKey: zkAppAddress }, 'https://api.minascan.io/node/berkeley/v1/graphql');
  await fetchAccount({ publicKey: userAddress }, 'https://api.minascan.io/node/berkeley/v1/graphql');

  const invoice = new Invoice({
    id: Field(1),
    dueDate: UInt32.from(Math.floor(Date.now()/1000)),
    from: userAddress,
    to: userAddress,
    amount: UInt32.from(1),
    settled: Bool(false),
    metadataHash: Field(0)
  })

  const witness = new InvoicesWitness(Tree.getWitness(0n))

  let tx = await Mina.transaction({ sender: feepayerAddress, fee }, () => {

    invoicesZkApp.createInvoice(invoice, witness);
    zkApp.approveAccountUpdate(invoicesZkApp.self);
  });

  console.log(tx.toPretty());

  await tx.prove();
  console.log('send transaction...');
  sentTx = await tx.sign([feepayerKey, userKey]).send();
} catch (err) {
  console.log(err);
}

if (sentTx?.hash() !== undefined) {
  console.log(`
Success! Update transaction sent.

Your smart contract state will be updated
as soon as the transaction is included in a block:
${getTxnUrl(config.url, sentTx.hash())}
`);
}

function getTxnUrl(graphQlUrl: string, txnHash: string | undefined) {
  const txnBroadcastServiceName = new URL(graphQlUrl).hostname
    .split('.')
    .filter((item) => item === 'minascan' || item === 'minaexplorer')?.[0];
  const networkName = new URL(graphQlUrl).hostname
    .split('.')
    .filter((item) => item === 'berkeley' || item === 'testworld')?.[0];
  if (txnBroadcastServiceName && networkName) {
    return `https://minascan.io/${networkName}/tx/${txnHash}?type=zk-tx`;
  }
  return `Transaction hash: ${txnHash}`;
}
