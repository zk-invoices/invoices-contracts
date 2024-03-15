import { Field, MerkleTree, UInt32, PrivateKey, Bool, verify, Signature } from 'o1js';
import { CartItem, Invoice, InvoiceCart, InvoiceCartWiteness, InvoicesWitness } from './InvoicesModels.js';

import InvoicesProgram, { InvoicesState } from './InvoicesProgram.js';

describe('InvoicesProgram', () => {
  it('test basic functions', async () => {
    const userPrivateKey = PrivateKey.random();
    console.log('start');

    console.time('compile');
    const vk = await InvoicesProgram.compile();
    console.timeEnd('compile');

    console.time('init');
    const initSign = Signature.create(userPrivateKey, Field(0).toFields());
    const proof = await InvoicesProgram.init({ state: InvoicesState.empty(), operator: userPrivateKey.toPublicKey() }, initSign);
    console.timeEnd('init');

    const tree = new MerkleTree(32);
    const sender = PrivateKey.random();
    const receiver = PrivateKey.random();
    const cartTree = new MerkleTree(8);

    const items = new InvoiceCart({
      items: UInt32.from(0),
      total: UInt32.from(0),
      root: cartTree.getRoot()
    });

    const firstItem = new CartItem({
      id: Field(1),
      quantity: UInt32.from(1),
      price: UInt32.from(1)
    });
    const secondItem = new CartItem({
      id: Field(2),
      quantity: UInt32.from(2),
      price: UInt32.from(2)
    });

    const firstItemWitness = new InvoiceCartWiteness(cartTree.getWitness(0n));

    items.addItem(firstItem, firstItemWitness);
    cartTree.setLeaf(0n, firstItem.hash())

    items.addItem(secondItem, new InvoiceCartWiteness(cartTree.getWitness(1n)));
    cartTree.setLeaf(1n, secondItem.hash())

    const invc = new Invoice({
      id: Field(1),
      dueDate: UInt32.from(Math.floor(Date.now() / 1000)),
      from: sender.toPublicKey(),
      to: receiver.toPublicKey(),
      amount: UInt32.from(1),
      settled: Bool(false),
      metadataHash: Field(0),
      itemsRoot: items.root
    });

    const createSign = Signature.create(userPrivateKey, invc.hash().toFields());
    console.time('create');
    const proof1 = await InvoicesProgram.createInvoice(
      proof.publicOutput,
      proof,
      invc,
      new InvoicesWitness(tree.getWitness(0n)),
      createSign
    );
    console.timeEnd('create');

    console.time('verify');
    const success = await verify(proof1, vk.verificationKey);
    console.timeEnd('verify');

    expect(success).toBe(true);
  });
});
