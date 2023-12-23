import { Invoices } from './Invoices';
import { Invoice, InvoicesWitness } from './InvoicesModels';
import { Field, Mina, PrivateKey, PublicKey, AccountUpdate, MerkleTree, UInt32, Bool, VerificationKey } from 'o1js';
import { InvoicesProvider } from './InvoicesProvider';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('Invoices', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: InvoicesProvider,
    Tree: MerkleTree,
    testAccounts: { publicKey: PublicKey, privateKey: PrivateKey }[],
    vkInvoices: VerificationKey;

  beforeAll(async () => {
    await InvoicesProvider.compile();
    let { verificationKey } = await Invoices.compile();

    vkInvoices = verificationKey;
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });

    testAccounts = Local.testAccounts;

    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new InvoicesProvider(zkAppAddress);

    Tree = new MerkleTree(32);
  });

  async function localDeploy() {
    let invoices = [new Invoice({
      from: testAccounts[1].publicKey,
      to: testAccounts[1].publicKey,
      amount: UInt32.from(1),
      settled: Bool(false),
      metadataHash: Field(0)
    })];

    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy({});
      zkApp.account.tokenSymbol.set('bills');
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `Invoices` smart contract', async () => {
    await localDeploy();
  });
});
