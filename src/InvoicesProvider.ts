import {
  Field,
  AccountUpdate,
  Bool,
  SmartContract,
  DeployArgs,
  PublicKey,
  VerificationKey,
  Permissions,
  method,
  Reducer,
  Account,
  UInt32
} from 'o1js';
import { Invoice, InvoicesWitness } from './InvoicesModels';
import { Invoices } from './Invoices';

export class InvoicesProvider extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      setDelegate: Permissions.proof(),
      incrementNonce: Permissions.proofOrSignature(),
      setVotingFor: Permissions.proof(),
      setTiming: Permissions.proof(),
      send: Permissions.proofOrSignature()
    });
  }

  @method
  mint(address: PublicKey, vk: VerificationKey, initialRoot: Field, initialLimit: Field) {
    this.token.mint({ address, amount: 1 });
    const isNewAccount = Account(address, this.token.id).isNew.get();

    isNewAccount.assertTrue('Token already minted');

    const update = AccountUpdate.createSigned(address, this.token.id);

    update.body.update.verificationKey = { isSome: Bool(true), value: vk };
    update.body.update.permissions = {
      isSome: Bool(true),
      value: {
        ...Permissions.default(),
        setDelegate: Permissions.proof(),
        incrementNonce: Permissions.proofOrSignature(),
        setVotingFor: Permissions.proof(),
        setTiming: Permissions.proof(),
        send: Permissions.proofOrSignature()
      },
    };

    update.body.update.appState = [
      { isSome: Bool(true), value: initialRoot },
      { isSome: Bool(true), value: Reducer.initialActionState },
      { isSome: Bool(true), value: Field.from(initialLimit) },
      { isSome: Bool(true), value: Field.from(0) },
      { isSome: Bool(true), value: Field(0) },
      { isSome: Bool(true), value: Field(0) },
      { isSome: Bool(true), value: Field(0) },
      { isSome: Bool(true), value: Field(0) },
    ];
  }

  @method createInvoice(address: PublicKey, invoice: Invoice, path: InvoicesWitness) {
    const zkAppTokenAccount = new Invoices(address, this.token.id);

    zkAppTokenAccount.createInvoice(invoice, path);
  }

  @method settleInvoice(address: PublicKey, invoice: Invoice, path: InvoicesWitness) {
    const zkAppTokenAccount = new Invoices(address, this.token.id);
    zkAppTokenAccount.settleInvoice(invoice, path);
  }

  @method commit(address: PublicKey) {
    const zkAppTokenAccount = new Invoices(address, this.token.id);
    zkAppTokenAccount.commit();
  }

  @method increaseLimit(address: PublicKey, amount: UInt32) {
    const zkAppTokenAccount = new Invoices(address, this.token.id);
    zkAppTokenAccount.increaseLimit(amount);
  }
}

// async function run() {
//   let Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
//   Mina.setActiveInstance(Local);
//   let initialBalance = 10_000_000_000;

//   let feePayerKey = Local.testAccounts[0].privateKey;
//   let feePayer = Local.testAccounts[0].publicKey;

//   const userPrivateKey = PrivateKey.random();
//   const userPublicKey = userPrivateKey.toPublicKey();

//   const receiverPrivateKey = PrivateKey.random();
//   const receiverPublicKey = receiverPrivateKey.toPublicKey();

//   // the zkapp account
//   let zkappKey = PrivateKey.random();
//   let zkappAddress = zkappKey.toPublicKey();

//   const Tree = new MerkleTree(32);

//   // now that we got our accounts set up, we need the commitment to deploy our contract!
  
//   let tokensApp = new InvoiceProvider(zkappAddress);
//   console.log('Deploying nested tokens');
//   console.time();
//   const cache: Cache = Cache.FileSystem("./localcache");
//   const ocache: Cache = Cache.FileSystem("./olocalcache");
  
//   const { verificationKey } = (await Invoices.compile({ cache: ocache }));

//   await InvoiceProvider.compile({ cache });
//   console.timeEnd();
//   console.log('compiled');
//   let tx = await Mina.transaction(feePayer, () => {
//     AccountUpdate.fundNewAccount(feePayer).send({
//       to: zkappAddress,
//       amount: initialBalance
//     });
//     tokensApp.deploy({});
//     tokensApp.account.tokenSymbol.set('bills');
//   });
//   await tx.prove();
//   await tx.sign([feePayerKey, zkappKey]).send();

//   const invoice = new Invoice({
//     from: Local.testAccounts[1].publicKey,
//     to: Local.testAccounts[1].publicKey,
//     amount: UInt64.from(1),
//     settled: Bool(false),
//     metadataHash: Field(0),
//   });

//   await mintAccount(userPrivateKey);
//   await mintAccount(receiverPrivateKey);
//   await update();
//   await settle();
//   await commit();

//   async function mintAccount(privateKey: PrivateKey) {
//     const publicKey = privateKey.toPublicKey();
//     console.log(`minting for`, publicKey.toBase58());
//     let tx = await Mina.transaction(feePayer, () => {
//       AccountUpdate.fundNewAccount(feePayer).send({
//         to: publicKey,
//         amount: initialBalance
//       });
//       AccountUpdate.fundNewAccount(feePayer);
//       tokensApp.mint(privateKey.toPublicKey(), verificationKey);
//     });
//     await tx.prove();
//     await tx.sign([feePayerKey, privateKey]).send();
//   }

//   async function update() {
//     console.log('updating');
//     const w = Tree.getWitness(0n);
//     let witness = new InvoicesWitness(w);

//     let tx = await Mina.transaction(userPublicKey, () => {
//       tokensApp.createInvoice(userPublicKey, invoice, witness, receiverPublicKey);
//     });

//     console.log(tx.toPretty());

//     await tx.prove();
//     await tx.sign([feePayerKey, zkappKey, userPrivateKey, receiverPrivateKey]).send();

//     Tree.setLeaf(0n, invoice.hash());
//   }

//   async function settle() {
//     console.log('settle invoice');
//     const w = Tree.getWitness(0n);
//     let witness = new InvoicesWitness(w);

//     let tx = await Mina.transaction(feePayer, () => {
//       tokensApp.settleInvoice(userPublicKey, invoice, witness);
//     });
//     await tx.prove();
//     await tx.sign([feePayerKey, userPrivateKey]).send();
//   }

//   async function commit() {
//     console.log('commit settlement');
//     let tx = await Mina.transaction(feePayer, () => {
//       tokensApp.commit(userPublicKey);
//     });
//     await tx.prove();
//     await tx.sign([feePayerKey, userPrivateKey]).send();
//   }
// }

// run();