import fs from 'fs/promises';
import { Mina, PrivateKey, AccountUpdate } from 'o1js';
import { Invoices } from '../Invoices.js';
import { InvoicesProviderToken } from '../InvoicesProviderToken.js';

// check command line arg
let deployAlias = process.argv[2];
if (!deployAlias)
  throw Error(`Missing <deployAlias> argument.

Usage:
node build/src/actions/deployContract.js <deployAlias>
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
const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
let feepayerAddress = feepayerKey.toPublicKey();
let zkAppAddress = zkAppKey.toPublicKey();

let zkApp = new InvoicesProviderToken(zkAppAddress);

let sentTx;
// compile the contract to create prover keys
console.log('compile the contract...');

await InvoicesProviderToken.compile();
const invoicesZkApp = await Invoices.compile();

try {
  // call update() and send transaction
  console.log('build transaction and create proof...');

  let tx = await Mina.transaction({ sender: feepayerAddress, fee }, () => {
    AccountUpdate.fundNewAccount(feepayerAddress);
    zkApp.deploy({});
    zkApp.account.tokenSymbol.set('invcs');
    zkApp.tokenZkAppVkHash.set(invoicesZkApp.verificationKey.hash);
  });

  console.log(tx.toPretty());

  await tx.prove();
  console.log('send transaction...');
  sentTx = await tx.sign([feepayerKey, zkAppKey]).send();
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
