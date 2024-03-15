
import {
  Poseidon,
  Field,
  PublicKey,
  UInt32,
  MerkleWitness,
  Struct,
  Bool,
  MerkleMap,
  Provable,
} from 'o1js';

export class InvoicesWitness extends MerkleWitness(32) {}
export class InvoiceCartWiteness extends MerkleWitness(8) {}

export class CartItem extends Struct({
  id: Field,
  price: UInt32,
  quantity: UInt32  
}) {
  hash() {
    const merkleMap = new MerkleMap();

    merkleMap.set(Field(0), Poseidon.hash(this.id.toFields()));
    merkleMap.set(Field(1), Poseidon.hash(this.price.toFields()));
    merkleMap.set(Field(2), Poseidon.hash(this.quantity.toFields()));

    return merkleMap.getRoot();
  }
}

export class InvoiceCart extends Struct({
  root: Field,
  total: UInt32,
  items: UInt32
}) {
  addItem(item: CartItem, itemWitness: InvoiceCartWiteness) {
    this.items = this.items.add(Provable.if(itemWitness.calculateRoot(Field(0)).equals(this.root), UInt32.from(1), UInt32.from(0)));
    this.root = itemWitness.calculateRoot(item.hash());
    this.total = this.total.add(item.price.mul(item.quantity));
  }
}

const keyMap = {
  id: Field(0),
  seller: Field(1),
  buyer: Field(2),
  amount: Field(3),
  settled: Field(4),
  metadataHash: Field(5),
  dueDate: Field(6)
};

export class Invoice extends Struct({
  id: Field,
  seller: PublicKey,
  buyer: PublicKey,
  amount: UInt32,
  settled: Bool,
  metadataHash: Field,
  itemsRoot: Field,
  dueDate: UInt32
}) {
  hash(): Field {
    const map = new MerkleMap();

    map.set(keyMap.id, Poseidon.hash(this.id.toFields()))
    map.set(keyMap.seller, Poseidon.hash(this.seller.toFields()))
    map.set(keyMap.buyer, Poseidon.hash(this.buyer.toFields()))
    map.set(keyMap.amount, Poseidon.hash(this.amount.toFields()))
    map.set(keyMap.metadataHash, Poseidon.hash(this.metadataHash.toFields()))
    map.set(keyMap.dueDate, Poseidon.hash(this.dueDate.toFields()));

    return map.getRoot();
  }

  claim() {
    return new Invoice({
      id: this.id,
      seller: this.seller,
      buyer: this.buyer,
      amount: this.amount,
      metadataHash: this.metadataHash,
      dueDate: this.dueDate,
      settled: Bool(true),
      itemsRoot: this.itemsRoot
    });
  }
}