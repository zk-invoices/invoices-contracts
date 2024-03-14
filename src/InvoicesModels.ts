
import {
  Poseidon,
  Field,
  PublicKey,
  UInt32,
  MerkleWitness,
  Struct,
  Bool,
  MerkleMap,
} from 'o1js';

export class InvoicesWitness extends MerkleWitness(32) {}

const keyMap = {
  id: Field(0),
  from: Field(1),
  to: Field(2),
  amount: Field(3),
  settled: Field(4),
  metadataHash: Field(5),
  dueDate: Field(6)
};

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
    const map = new MerkleMap();

    map.set(keyMap.id, Poseidon.hash(this.id.toFields()))
    map.set(keyMap.from, Poseidon.hash(this.from.toFields()))
    map.set(keyMap.to, Poseidon.hash(this.to.toFields()))
    map.set(keyMap.amount, Poseidon.hash(this.amount.toFields()))
    map.set(keyMap.metadataHash, Poseidon.hash(this.metadataHash.toFields()))
    map.set(keyMap.dueDate, Poseidon.hash(this.dueDate.toFields()));

    return map.getRoot();
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