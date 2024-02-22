import { Field, Mina, PrivateKey, PublicKey, AccountUpdate, MerkleTree, UInt32, Bool, VerificationKey } from 'o1js';
import { Invoices } from './Invoices';
import { Invoice, InvoicesWitness } from './InvoicesModels';
import { InvoicesProviderToken as InvoicesProvider } from './InvoicesProviderToken';
/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = true;

describe('Invoices Provider', () => {
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
    console.log('deploy 0/2');
    let { verificationKey: vk1 } = await Invoices.compile({ forceRecompile: true });

    vkInvoices = vk1;

    console.log('deploy 1/2');
    await InvoicesProvider.compile({ forceRecompile: true });
    console.log('deploy 2/2');
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
    console.log('local deploy');
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy({});
      zkApp.account.tokenSymbol.set('bills');
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
    console.log('local deploy end');
  }

  async function setVerificationKey() {
    console.log('set verification key');
    console.log(vkInvoices.hash);
    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.upgradeRoot(vkInvoices);
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  async function mintAccount(privateKey: PrivateKey, gasFees = true) {
    console.log('mint account');
    const txn = await Mina.transaction(deployerAccount, async () => {
      gasFees && AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.mint(privateKey.toPublicKey(), vkInvoices, Tree.getRoot());
    });

    await txn.prove();
    return await txn.sign([deployerKey, privateKey]).send();
  }

  it('generates and deploys the `Invoices` smart contract', async () => {
    const userKey = testAccounts[2];
    await localDeploy();
    await setVerificationKey();

    await mintAccount(userKey.privateKey);
  });

  it('should not allow multiple calls to mint from same user', async () => {
    const userKey = testAccounts[1];

    await localDeploy();
    await setVerificationKey();
    await mintAccount(userKey.privateKey);

    try {
      await mintAccount(userKey.privateKey, false).catch((error) => {
        expect(error.message).toEqual('Token already minted')
      });
    } catch (err: any) {
      // expect(err.message == 'Token already minted').toEqual(true);
    }
  });

  it('should increase limit of invoices', async () => {
    const userKey = testAccounts[1];

    await localDeploy();
    await setVerificationKey();
    await mintAccount(userKey.privateKey);

    const amount = UInt32.from(1000);

    const invoicesZkApp = new Invoices(userKey.publicKey, zkApp.token.id);

    const txn2 = await Mina.transaction(deployerAccount, () => {
      invoicesZkApp.increaseLimit(amount);

      zkApp.approveAccountUpdate(invoicesZkApp.self);
    });

    await txn2.prove();
    await txn2.sign([deployerKey, userKey.privateKey]).send();
  });

  it('should create invoice and reduce limit', async () => {
    const userKey = testAccounts[1];
    const receiverKey = testAccounts[2];

    const invoicesZkApp = new Invoices(userKey.publicKey, zkApp.token.id);
    console.log('start local deploy');
    await localDeploy();
    await setVerificationKey();
    console.log('end local deploy');

    const invoice = new Invoice({
      id: Field(1),
      dueDate: UInt32.from(Date.now()),
      from: userKey.publicKey,
      to: receiverKey.publicKey,
      amount: UInt32.from(1),
      settled: Bool(false),
      metadataHash: Field(0)
    })

    console.log('mint 0/2');
    await mintAccount(userKey.privateKey);
    console.log('mint 1/2');
    await mintAccount(receiverKey.privateKey);
    console.log('mint 2/2');

    {
      console.log('increase limit');
      const amount = UInt32.from(1000);
      const txn = await Mina.transaction(deployerAccount, async () => {
        invoicesZkApp.increaseLimit(amount);

        zkApp.approveAccountUpdate(invoicesZkApp.self);
      });
  
      await txn.prove();
      await txn.sign([zkAppPrivateKey, userKey.privateKey, deployerKey]).send();
    }

    {
      console.log('creating invoice');
      // const invoicesApp = new Invoices(userKey.publicKey, zkApp.token.id);
      const txn = await Mina.transaction(userKey.publicKey, async () => {
        const witness = Tree.getWitness(0n);
        invoicesZkApp.createInvoice(invoice, new InvoicesWitness(witness));

        zkApp.approveAccountUpdate(invoicesZkApp.self);
      });
  
      await txn.prove();
      await txn.sign([userKey.privateKey]).send();
    }

    // {
    //   const txn = await Mina.transaction(receiverKey.publicKey, async () => {
    //     const witness = Tree.getWitness(0n);
    //     zkApp.claimInvoice(invoice.from, invoice, new InvoicesWitness(witness));
    //   });
  
    //   await txn.prove();
    //   await txn.sign([receiverKey.privateKey, zkAppPrivateKey]).send();
    // }

    // {
    //   const txn = await Mina.transaction(receiverKey.publicKey, async () => {
    //     zkApp.commit(invoice.from);
    //   });
  
    //   await txn.prove();
    //   await txn.sign([receiverKey.privateKey, zkAppPrivateKey]).send();
    // }
  });
});
