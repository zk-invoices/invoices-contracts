import { Invoices } from './Invoices';
import { Invoice, InvoicesWitness } from './InvoicesModels';
import { Field, Mina, PrivateKey, PublicKey, AccountUpdate, MerkleTree, UInt32, Bool } from 'o1js';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = true;

describe.skip('Invoices', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Invoices,
    invoices: Invoice[] = [],
    Tree: MerkleTree,
    testAccounts: { publicKey: PublicKey, privateKey: PrivateKey }[];

  beforeAll(async () => {
    if (proofsEnabled) await Invoices.compile();
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
    zkApp = new Invoices(zkAppAddress);
    Tree = new MerkleTree(32);

    invoices = [new Invoice({
      id: Field(1),
      dueDate: UInt32.from(Date.now()),
      createdAt: UInt32.from(Date.now()),
      updatedAt: UInt32.from(Date.now()),
      seller: Local.testAccounts[1].publicKey,
      buyer:Local.testAccounts[1].publicKey,
      amount: UInt32.from(1),
      settled: Bool(false),
      metadataHash: Field(0),
      itemsRoot: Field(0)
    })];
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy({});
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
      zkApp.claimInvoice(invoices[0], new InvoicesWitness(Tree.getWitness(0n)));
    });
    await txn5.prove();
    await txn5.sign([senderKey]).send();

    Tree.setLeaf(0n, invoices[0].claim().hash());

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
      zkApp.claimInvoice(invoices[0], new InvoicesWitness(Tree.getWitness(0n)));
    });
    await txn2.prove();
    await txn2.sign([senderKey]).send();
    Tree.setLeaf(0n, invoices[0].claim().hash());

    const txn3 = await Mina.transaction(senderAccount, () => {
      zkApp.commit();
    });
    await txn3.prove();
    await txn3.sign([senderKey]).send();

    const commit = zkApp.commitment.get();
    expect(commit).toEqual(Tree.getRoot());
  });

  it('not create an invoice if it exceeds the limit', async () => {
    await localDeploy();

    const overLimitInvoice = new Invoice({
      id: Field(1),
      dueDate: UInt32.from(Date.now()),
      createdAt: UInt32.from(Date.now()),
      updatedAt: UInt32.from(Date.now()),
      seller: testAccounts[1].publicKey,
      buyer:testAccounts[1].publicKey,
      amount: UInt32.from(1000000),
      settled: Bool(false),
      metadataHash: Field(0),
      itemsRoot: Field(0)
    });

    try {
      const txn = await Mina.transaction(senderAccount, () => {
        zkApp.createInvoice(overLimitInvoice, new InvoicesWitness(Tree.getWitness(0n)));
      });

      await txn.prove();
      await txn.sign([senderKey]).send();
    } catch (err: any) { 
      expect(err.message).toEqual('Limit already used')
    }
  });

  it('create an invoice after limit is updated', async () => {
    await localDeploy();

    const overLimitInvoice = new Invoice({
      id: Field(1),
      dueDate: UInt32.from(Date.now()),
      createdAt: UInt32.from(Date.now()),
      updatedAt: UInt32.from(Date.now()),
      seller: testAccounts[1].publicKey,
      buyer:testAccounts[1].publicKey,
      amount: UInt32.from(1000000),
      settled: Bool(false),
      metadataHash: Field(0),
      itemsRoot: Field(0)
    });

    try {
      const txn = await Mina.transaction(senderAccount, () => {
        zkApp.createInvoice(overLimitInvoice, new InvoicesWitness(Tree.getWitness(0n)));
      });

      await txn.prove();
      await txn.sign([senderKey]).send();
    } catch (err: any) { 
      expect(err.message).toEqual('Limit already used')
    }

    const txn2 = await Mina.transaction(senderAccount, () => {
      zkApp.increaseLimit(UInt32.from(1000000));
    });

    await txn2.prove();
    await txn2.sign([senderKey]).send();

    const txn3 = await Mina.transaction(senderAccount, () => {
      zkApp.createInvoice(overLimitInvoice, new InvoicesWitness(Tree.getWitness(0n)));
    });

    await txn3.prove();
    await txn3.sign([senderKey]).send();
  });
});
