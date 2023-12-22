/*
Description: 

This example describes how developers can use Merkle Trees as a basic off-chain storage tool.

zkApps on Mina can only store a small amount of data on-chain, but many use cases require your application to at least reference big amounts of data.
Merkle Trees give developers the power of storing large amounts of data off-chain, but proving its integrity to the on-chain smart contract!


! Unfamiliar with Merkle Trees? No problem! Check out https://blog.ethereum.org/2015/11/15/merkling-in-ethereum/
*/

import {
  SmartContract,
  Field,
  State,
  state,
  method,
  MerkleTree,
  Struct,
  Bool,
  Reducer,
  Provable,
  UInt64,
  UInt32,
} from 'o1js';
import { Invoice } from './InvoicesModels';
import { InvoicesWitness } from './InvoicesModels';


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
  @state(UInt64) limit = State<UInt32>();
  @state(UInt64) usage = State<UInt32>();

  reducer = Reducer({ actionType: InvoiceOperation });

  @method init() {
    super.init();
    this.accumulated.set(Reducer.initialActionState);
    this.commitment.set(initialRoot);
    this.limit.set(UInt32.from(10000));
    this.usage.set(UInt32.from(0));
  }

  @method
  createInvoice(invoice: Invoice, path: InvoicesWitness) {
    let commit = this.commitment.get();
    this.commitment.requireEquals(commit);

    let currentLimit = this.limit.get();
    this.limit.requireEquals(currentLimit);

    let currentUsed = this.usage.get();
    this.usage.requireEquals(currentUsed);

    path
      .calculateRoot(Field(0))
      .equals(commit)
      .assertTrue('The invoice already exists');

    let accumulated = this.accumulated.get();
    this.accumulated.requireEquals(accumulated);

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

    let { state: usedLimit } = this.reducer.reduce(
      pendingActions,
      UInt32,
      (state: UInt32, action: InvoiceOperation) => {
        return Provable.if(action.isCreate(), state.add(invoice.amount), state);
      },
      { state: currentLimit, actionState: accumulated }
    );

    state.assertFalse('The invoice already exists');
    currentUsed.add(invoice.amount).assertLessThanOrEqual(usedLimit, 'Limit already used');

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
    this.accumulated.requireEquals(accumulated);

    let commitment = this.commitment.get();
    this.commitment.requireEquals(commitment);

    let currentUsage = this.usage.get();
    this.usage.requireEquals(currentUsage);

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

    let { state: newUsage } =
      this.reducer.reduce(
        pendingActions,
        UInt32,
        (state: UInt32, action: InvoiceOperation) => {
          return Provable.if(
            action.isCreate(),
            state.add(action.invoice.amount),
            state
          );
        },
        { state: currentUsage, actionState: accumulated }
      );

    this.usage.set(newUsage);
    this.commitment.set(newCommitment);
    this.accumulated.set(newAccumulated);
  }

  @method
  increaseLimit(amount: UInt32) {
    const currentLimit = this.limit.get();
    this.limit.requireEquals(currentLimit);

    this.limit.set(currentLimit.add(amount));
  }
}
