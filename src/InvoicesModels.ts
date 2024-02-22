
import {
  Poseidon,
  Field,
  PublicKey,
  UInt32,
  MerkleWitness,
  Struct,
  Bool,
} from 'o1js';

export class InvoicesWitness extends MerkleWitness(32) {}

export class Invoice extends Struct({
  id: Field,
  from: PublicKey,
  to: PublicKey,
  amount: UInt32,
  settled: Bool,
  metadataHash: Field,
  dueDate: UInt32
}) {
  hash(): Field {
    return Poseidon.hash(Invoice.toFields(this));
  }

  claim() {
    return new Invoice({
      id: this.id,
      from: this.from,
      to: this.to,
      amount: this.amount,
      metadataHash: this.metadataHash,
      dueDate: this.dueDate,
      settled: Bool(true),
    });
  }
}