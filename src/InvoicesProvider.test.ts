import { Field, Mina, PrivateKey, PublicKey, AccountUpdate, MerkleTree, UInt32, Bool, VerificationKey, Cache, fetchAccount } from 'o1js';
import { Invoices } from './Invoices';
import { Invoice, InvoicesWitness } from './InvoicesModels';
import { InvoicesProvider } from './InvoicesProvider';
import { LocalBlockchain } from 'o1js/dist/node/lib/mina';
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
    const cache: Cache = Cache.FileSystem("./localcache");
    const ocache: Cache = Cache.FileSystem("./olocalcache");

    // console.log('compiling zkApp')
    let { verificationKey: vk1 } = await Invoices.compile({ cache: ocache });

    vkInvoices = vk1;

    await InvoicesProvider.compile({ cache });
    // console.log('compiled zkApp');
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
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      // console.log('deploying zkApp')
      zkApp.deploy({});
      // console.log('deployed zkApp')
      zkApp.account.tokenSymbol.set('bills');
      zkApp.tokenZkAppVkHash.set(vkInvoices.hash);
    });
    // await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  async function mintAccount(privateKey: PrivateKey, gasFees = true) {
    const txn = await Mina.transaction(deployerAccount, async () => {
      gasFees && AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.mint(privateKey.toPublicKey(), vkInvoices, Tree.getRoot());
    }); 

    // printTxn(txn, 'first', legend);
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    return await txn.sign([deployerKey, privateKey]).send();
  }

  // function logKeys() {
  //   console.log('user key', userKey.publicKey.toBase58());
  //   console.log('rec key', receiverKey.publicKey.toBase58());
  //   console.log('deployer key', deployerKey.toPublicKey().toBase58())
  //   console.log('deployer key', zkAppPrivateKey.toPublicKey().toBase58())
  // }

  it('generates and deploys the `Invoices` smart contract', async () => {
    const userKey = testAccounts[2];
    await localDeploy();

    await mintAccount(userKey.privateKey);
  });

  it.skip('should not allow multiple calls to mint from same user', async () => {
    const userKey = testAccounts[1];

    console.log('test');
    await localDeploy();
    try {
      await mintAccount(userKey.privateKey);
    } catch (err: any) {
      console.log(err.message);
      console.log('error not expected here');
    }

    try {
      await mintAccount(userKey.privateKey, false).catch((error) => {
        expect(error.message).toEqual('Token already minted')
      });
    } catch (err: any) {
      // console.log(err.message, 'error expected here');
      // expect(err.message == 'Token already minted').toEqual(true);
    }
  });

  it('should increase limit of invoices', async () => {
    const userKey = testAccounts[1];

    await localDeploy();
    await mintAccount(userKey.privateKey);

    const txn2 = await Mina.transaction(deployerAccount, () => {
      zkApp.increaseLimit(userKey.publicKey, UInt32.from(1000));
    });

    await txn2.prove();
    await txn2.sign([deployerKey, zkAppPrivateKey]).send();
  });

  it('should create invoice and reduce limit', async () => {
    const userKey = testAccounts[1];
    const receiverKey = testAccounts[2];
    await localDeploy();

    const invoice = new Invoice({
      from: userKey.publicKey,
      to: receiverKey.publicKey,
      amount: UInt32.from(1),
      settled: Bool(false),
      metadataHash: Field(0)
    })

    await mintAccount(userKey.privateKey);
    await mintAccount(receiverKey.privateKey);

    {
      console.log('txn1');
      const txn = await Mina.transaction(deployerAccount, async () => {
        zkApp.increaseLimit(userKey.publicKey, UInt32.from(1000));
      });
  
      await txn.prove();
      await txn.sign([zkAppPrivateKey, deployerKey]).send();
    }

    {
      console.log('txn2');
      const invoicesApp = new Invoices(userKey.publicKey, zkApp.token.id);
      const txn = await Mina.transaction(userKey.publicKey, async () => {
        const witness = Tree.getWitness(0n);
        zkApp.createInvoice(userKey.publicKey, invoice, new InvoicesWitness(witness));
      });

      console.log(txn.toPretty());
  
      await txn.prove();
      await txn.sign([zkAppPrivateKey, userKey.privateKey]).send();
    }

    {
      console.log('txn3');
      const txn = await Mina.transaction(receiverKey.publicKey, async () => {
        const witness = Tree.getWitness(0n);
        zkApp.settleInvoice(invoice.from, invoice, new InvoicesWitness(witness));
      });
  
      await txn.prove();
      await txn.sign([receiverKey.privateKey, zkAppPrivateKey]).send();
    }

    {
      console.log('txn4');
      const txn = await Mina.transaction(receiverKey.publicKey, async () => {
        zkApp.commit(invoice.from);
      });
  
      await txn.prove();
      await txn.sign([receiverKey.privateKey, zkAppPrivateKey]).send();
    }
  });
});
