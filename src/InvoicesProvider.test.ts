import { Field, Mina, PrivateKey, PublicKey, AccountUpdate, MerkleTree, UInt32, Bool, VerificationKey, Cache, fetchAccount } from 'o1js';
import { Invoices } from './Invoices';
import { Invoice, InvoicesWitness } from './InvoicesModels';
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
    let { verificationKey: vk1 } = await Invoices.compile();

    vkInvoices = vk1;

    await InvoicesProvider.compile();
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
      zkApp.deploy({});
      zkApp.account.tokenSymbol.set('bills');
      zkApp.tokenZkAppVkHash.set(vkInvoices.hash);
    });
    // await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `Invoices` smart contract', async () => {
    await localDeploy();

    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.mint(testAccounts[2].publicKey, vkInvoices, Tree.getRoot(), Field.from(1000));
    }); 
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey, testAccounts[2].privateKey]).send();
  });

  it('should not allow multiple calls to mint from same user', async () => {
    await localDeploy();

    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.mint(testAccounts[2].publicKey, vkInvoices, Tree.getRoot(), Field.from(1000));
    }); 
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey, testAccounts[2].privateKey]).send();

    try {
      const txn2 = await Mina.transaction(deployerAccount, () => {
        AccountUpdate.fundNewAccount(deployerAccount);
        zkApp.mint(testAccounts[2].publicKey, vkInvoices, Tree.getRoot(), Field.from(1000));
      }); 
      await txn2.prove();
      // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
      await txn2.sign([deployerKey, zkAppPrivateKey, testAccounts[2].privateKey]).send();
    } catch (err: any) {
      expect(err.message).toEqual('Token already minted');
    }
  });

  it('should increase limit of invoices', async () => {
    await localDeploy();

    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.mint(testAccounts[2].publicKey, vkInvoices, Tree.getRoot(), Field.from(1000));
    }); 
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey, testAccounts[2].privateKey]).send();

    const txn2 = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.increaseLimit(testAccounts[2].publicKey, UInt32.from(1000));
    }); 
    // await txn2.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn2.sign([deployerKey, zkAppPrivateKey, testAccounts[2].privateKey]).send();
  });

  it('should create invoice and reduce limit', async () => {
    await localDeploy();

    const invoice = new Invoice({
      from: testAccounts[1].publicKey,
      to: testAccounts[1].publicKey,
      amount: UInt32.from(1),
      settled: Bool(false),
      metadataHash: Field(0)
    })

    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.mint(testAccounts[2].publicKey, vkInvoices, Tree.getRoot(), Field.from(1000));
    }); 
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey, testAccounts[2].privateKey]).send();

    await fetchAccount({ publicKey: testAccounts[2].publicKey, tokenId: zkApp.token.id });
    const txn2 = await Mina.transaction(deployerAccount, async () => {
      const witness = Tree.getWitness(0n);
      zkApp.createInvoice(testAccounts[2].publicKey, invoice, new InvoicesWitness(witness));
      zkApp.commit(testAccounts[2].publicKey);
    });
    await txn2.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn2.sign([deployerKey, zkAppPrivateKey, testAccounts[2].privateKey]).send();
  });
});
