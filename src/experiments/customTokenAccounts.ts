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
  Cache,
  Mina,
  PrivateKey,
  MerkleTree,
  UInt32,
  MerkleWitness,
  Struct,
  Poseidon,
  state,
  State,
  Reducer,
  Provable
} from 'o1js';

export class InvoicesWitness extends MerkleWitness(32) {}

export class Invoice extends Struct({
  from: PublicKey,
  to: PublicKey,
  amount: UInt32,
  settled: Bool,
  metadataHash: Field,
}) {
  hash(): Field {
    return Poseidon.hash(Invoice.toFields(this));
  }

  settle() {
    return new Invoice({
      from: this.from,
      to: this.to,
      amount: this.amount,
      metadataHash: this.metadataHash,
      settled: Bool(true),
    });
  }
}
// we now need "wrap" the Merkle tree around our off-chain storage
// we initialize a new Merkle Tree with height 8
const initialRoot = new MerkleTree(32).getRoot();
export class InvoiceOperation extends Struct({
  type: Field,
  invoice: Invoice,
  witness: InvoicesWitness,
}) {
  isCreate() {
    return this.type.equals(Field(0));
  }

  isSettle() {
    return this.type.equals(Field(1));
  }

  static create(invoice: Invoice, witness: InvoicesWitness) {
    return new InvoiceOperation({
      type: Field(0),
      invoice,
      witness,
    });
  }

  static settle(invoice: Invoice, witness: InvoicesWitness) {
    return new InvoiceOperation({
      type: Field(1),
      invoice,
      witness,
    });
  }
}

export class Invoices extends SmartContract {
  @state(Field) commitment = State<Field>();
  @state(Field) accumulated = State<Field>();

  reducer = Reducer({ actionType: InvoiceOperation });

  @method init() {
    super.init();
    this.accumulated.set(Reducer.initialActionState);
    this.commitment.set(initialRoot);
  }

  @method
  createInvoice(invoice: Invoice, path: InvoicesWitness) {
    let commit = this.commitment.get();
    this.commitment.assertEquals(commit);

    path
      .calculateRoot(Field(0))
      .equals(commit)
      .assertTrue('The invoice already exists');

    let accumulated = this.accumulated.get();
    this.accumulated.assertEquals(accumulated);

    let pendingActions = this.reducer.getActions({
      fromActionState: accumulated,
    });

    let { state } = this.reducer.reduce(
      pendingActions,
      Bool,
      (state: Bool, action: InvoiceOperation) => {
        return Bool(
          action.isCreate().and(action.invoice.hash().equals(invoice.hash()))
        ).or(state);
      },
      { state: Bool(false), actionState: accumulated }
    );

    state.assertFalse('The invoice already exists');

    this.reducer.dispatch(InvoiceOperation.create(invoice, path));
  }

  @method
  settleInvoice(invoice: Invoice, path: InvoicesWitness) {
    let commit = this.commitment.get();
    this.commitment.assertEquals(commit);

    let accumulated = this.accumulated.get();
    this.accumulated.assertEquals(accumulated);

    invoice.settled.assertFalse('Invoice is already settled');
    let isCreateCommitted = path.calculateRoot(invoice.hash()).equals(commit);

    let { state: isCreatePending } = this.reducer.reduce(
      this.reducer.getActions({ fromActionState: accumulated }),
      Bool,
      (state: Bool, action: InvoiceOperation) => {
        return Bool(
          action.isCreate().and(action.invoice.hash().equals(invoice.hash()))
        ).or(state);
      },
      { state: Bool(false), actionState: accumulated }
    );

    isCreateCommitted.or(isCreatePending).assertTrue('Invoice not created yet');

    let { state: isSettlePending } = this.reducer.reduce(
      this.reducer.getActions({ fromActionState: accumulated }),
      Bool,
      (state: Bool, action: InvoiceOperation) => {
        return Bool(
          action.isSettle().and(action.invoice.hash().equals(invoice.hash()))
        ).or(state);
      },
      { state: Bool(false), actionState: accumulated }
    );

    isSettlePending.assertFalse('Invoice settlement already in queue');

    this.reducer.dispatch(InvoiceOperation.settle(invoice, path));
  }

  @method
  commit() {
    let accumulated = this.accumulated.get();
    this.accumulated.assertEquals(accumulated);

    let commitment = this.commitment.get();
    this.commitment.assertEquals(commitment);

    let pendingActions = this.reducer.getActions({
      fromActionState: accumulated,
    });

    let { state: newCommitment, actionState: newAccumulated } =
      this.reducer.reduce(
        pendingActions,
        Field,
        (state: Field, action: InvoiceOperation) => {
          return action.witness.calculateRoot(
            Provable.if(
              action.isCreate(),
              action.invoice.hash(),
              action.invoice.settle().hash()
            )
          );
        },
        { state: commitment, actionState: accumulated }
      );

    this.commitment.set(newCommitment);
    this.accumulated.set(newAccumulated);
  }
}

const doProofs = true;

export class Token extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      setDelegate: Permissions.proof(),
      incrementNonce: Permissions.proof(),
      setVotingFor: Permissions.proof(),
      setTiming: Permissions.proof(),
    });
  }

  @method
  mint(address: PublicKey, vk: VerificationKey) {
    this.token.mint({ address, amount: 1 });
    const update = AccountUpdate.createSigned(address, this.token.id);
    update.body.update.verificationKey = { isSome: Bool(true), value: vk };
    update.body.update.permissions = {
      isSome: Bool(true),
      value: {
        ...Permissions.default(),
        setDelegate: Permissions.proof(),
        incrementNonce: Permissions.proof(),
        setVotingFor: Permissions.proof(),
        setTiming: Permissions.proof(),
      },
    };
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
}

async function run() {
  let Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
  Mina.setActiveInstance(Local);
  let initialBalance = 10_000_000_000;

  let feePayerKey = Local.testAccounts[0].privateKey;
  let feePayer = Local.testAccounts[0].publicKey;

  const userPrivateKey = PrivateKey.random();
  const userPublicKey = userPrivateKey.toPublicKey();

  // the zkapp account
  let zkappKey = PrivateKey.random();
  let zkappAddress = zkappKey.toPublicKey();

  const Tree = new MerkleTree(32);

  // now that we got our accounts set up, we need the commitment to deploy our contract!
  
  let tokensApp = new Token(zkappAddress);
  console.log('Deploying nested tokens');
  console.time();
  const cache: Cache = Cache.FileSystem("./localcache");
  
  const { verificationKey } = (await Invoices.compile());

  await Token.compile({ cache });
  console.timeEnd();
  console.log('compiled');
  let tx = await Mina.transaction(feePayer, () => {
    AccountUpdate.fundNewAccount(feePayer).send({
      to: zkappAddress,
      amount: initialBalance
    });
    tokensApp.deploy({});
    tokensApp.account.tokenSymbol.set('bills');
  });
  await tx.prove();
  await tx.sign([feePayerKey, zkappKey]).send();

  await mintToken();
  await update();

  async function mintToken() {
    console.log(`minting for`, userPublicKey.toBase58());
    let tx = await Mina.transaction(feePayer, () => {
      AccountUpdate.fundNewAccount(feePayer).send({
        to: userPublicKey,
        amount: initialBalance
      });
      AccountUpdate.fundNewAccount(feePayer);
      tokensApp.mint(userPrivateKey.toPublicKey(), verificationKey);
    });
    await tx.prove();
    await tx.sign([feePayerKey, userPrivateKey]).send();
  }

  async function update() {
    console.log('updating');
    const invoice = new Invoice({
      from: Local.testAccounts[1].publicKey,
      to: Local.testAccounts[1].publicKey,
      amount: UInt32.from(1),
      settled: Bool(false),
      metadataHash: Field(0),
    });
    const w = Tree.getWitness(0n);
    let witness = new InvoicesWitness(w);

    let tx = await Mina.transaction(feePayer, () => {
      tokensApp.createInvoice(userPublicKey, invoice, witness);
    });
    await tx.prove();
    await tx.sign([feePayerKey, userPrivateKey]).send();
  }
}

run();