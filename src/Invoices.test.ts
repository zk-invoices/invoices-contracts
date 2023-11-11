import { Invoice, Invoices, InvoicesWitness } from './Invoices';
import { Field, Mina, PrivateKey, PublicKey, AccountUpdate, MerkleTree, UInt32, Bool } from 'o1js';

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
    zkApp: Invoices,
    invoices: Invoice[] = [],
    Tree: MerkleTree;

  beforeAll(async () => {
    if (proofsEnabled) await Invoices.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Invoices(zkAppAddress);
    Tree = new MerkleTree(32);

    invoices = [new Invoice({
      from: Local.testAccounts[1].publicKey,
      to: Local.testAccounts[1].publicKey,
      amount: UInt32.from(1),
      settled: Bool(false),
      metadataHash: Field(0)
    })];
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
      zkApp.commitment.set(Tree.getRoot());
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `Invoices` smart contract', async () => {
    await localDeploy();
    const commit = zkApp.commitment.get();
    expect(commit).toEqual(Tree.getRoot());
  });

  it('correctly creates an invoice', async () => {
    await localDeploy();

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.createInvoice(invoices[0], new InvoicesWitness(Tree.getWitness(0n)));
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const txn2 = await Mina.transaction(senderAccount, () => {
      zkApp.commit();
    });
    await txn2.prove();
    await txn2.sign([senderKey]).send();

    Tree.setLeaf(0n, invoices[0].hash());

    const txn3 = await Mina.transaction(senderAccount, () => {
      zkApp.createInvoice(invoices[0], new InvoicesWitness(Tree.getWitness(1n)));
    });
    await txn3.prove();
    await txn3.sign([senderKey]).send();

    const txn4 = await Mina.transaction(senderAccount, () => {
      zkApp.commit();
    });
    await txn4.prove();
    await txn4.sign([senderKey]).send();

    Tree.setLeaf(1n, invoices[0].hash());

    const txn5 = await Mina.transaction(senderAccount, () => {
      zkApp.settleInvoice(invoices[0], new InvoicesWitness(Tree.getWitness(0n)));
    });
    await txn5.prove();
    await txn5.sign([senderKey]).send();

    Tree.setLeaf(0n, invoices[0].settle().hash());

    const txn7 = await Mina.transaction(senderAccount, () => {
      zkApp.commit();
    });
    await txn7.prove();
    await txn7.sign([senderKey]).send();

    const commit = zkApp.commitment.get();
    expect(commit).toEqual(Tree.getRoot());
  });

  it('correctly creates and settles an invoice', async () => {
    await localDeploy();

    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.createInvoice(invoices[0], new InvoicesWitness(Tree.getWitness(0n)));
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
    Tree.setLeaf(0n, invoices[0].hash());

    const txn2 = await Mina.transaction(senderAccount, () => {
      zkApp.settleInvoice(invoices[0], new InvoicesWitness(Tree.getWitness(0n)));
    });
    await txn2.prove();
    await txn2.sign([senderKey]).send();
    Tree.setLeaf(0n, invoices[0].settle().hash());

    const txn3 = await Mina.transaction(senderAccount, () => {
      zkApp.commit();
    });
    await txn3.prove();
    await txn3.sign([senderKey]).send();

    const commit = zkApp.commitment.get();
    expect(commit).toEqual(Tree.getRoot());
  });
});
