import { MerkleList, PrivateKey } from "o1js";
import {
  Field,
  Bool,
  PublicKey,
  Struct,
  Poseidon,
  UInt64,
} from 'o1js';

export class Invoice extends Struct({
  from: PublicKey,
  to: PublicKey,
  amount: UInt64,
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

const invoice = new Invoice({
  from: PrivateKey.random().toPublicKey(),
  to: PrivateKey.random().toPublicKey(),
  amount: UInt64.from(1),
  settled: Bool(false),
  metadataHash: Field(0),
});

const InvoicesList = MerkleList.create(Invoice);

const invoices = InvoicesList.empty();

invoices.push(invoice);

