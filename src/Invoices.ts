/*
Description: 

This example describes how developers can use Merkle Trees as a basic off-chain storage tool.

zkApps on Mina can only store a small amount of data on-chain, but many use cases require your application to at least reference big amounts of data.
Merkle Trees give developers the power of storing large amounts of data off-chain, but proving its integrity to the on-chain smart contract!


! Unfamiliar with Merkle Trees? No problem! Check out https://blog.ethereum.org/2015/11/15/merkling-in-ethereum/
*/

import {
  SmartContract,
  Poseidon,
  Field,
  State,
  state,
  PublicKey,
  Mina,
  method,
  UInt32,
  PrivateKey,
  AccountUpdate,
  MerkleTree,
  MerkleWitness,
  Struct,
  Encoding,
  Bool,
  Reducer,
  Provable,
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
