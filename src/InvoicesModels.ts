
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
  from: PublicKey,
  to: PublicKey,
  amount: UInt32,
  settled: Bool,
  metadataHash: Field,
}) {
  hash(): Field {
    return Poseidon.hash(Invoice.toFields(this));
  }

  claim() {
    return new Invoice({
      from: this.from,
      to: this.to,
      amount: this.amount,
      metadataHash: this.metadataHash,
      settled: Bool(true),
    });
  }
}