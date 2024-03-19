import { Field, MerkleTree, UInt32, PrivateKey, Bool, verify, Signature } from 'o1js';
import { CartItem, Invoice, InvoiceCart, InvoiceCartWiteness, InvoicesWitness } from './InvoicesModels.js';

import InvoicesProgram, { InvoicesState, SignedActionTimestamp } from './InvoicesProgram.js';

describe('InvoicesProgram', () => {
  it('test basic functions', async () => {
    const userPrivateKey = PrivateKey.random();
    const timeAuthorityKey = PrivateKey.random();
    console.log('start');

    console.time('compile');
    const vk = await InvoicesProgram.compile();
    console.timeEnd('compile');

    console.time('init');
    const initSign = Signature.create(userPrivateKey, Field(0).toFields());
    const proof = await InvoicesProgram.init({
      state: InvoicesState.empty(),
      operator: userPrivateKey.toPublicKey(),
      timeAuthority: timeAuthorityKey.toPublicKey(),
      creditAccount: userPrivateKey.toPublicKey(),
      creditAuthority: timeAuthorityKey.toPublicKey()
    }, initSign);
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

    const currentTimestamp = UInt32.from(Math.floor(Date.now() / 1000));
    const invc = new Invoice({
      id: Field(1),
      dueDate: currentTimestamp.add(30*24*60*60),
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
      buyer: sender.toPublicKey(),
      seller: receiver.toPublicKey(),
      amount: UInt32.from(1),
      settled: Bool(false),
      metadataHash: Field(0),
      itemsRoot: items.root
    });

    const createSign = Signature.create(userPrivateKey, invc.hash().toFields());
    const actionTimestamp = SignedActionTimestamp.signedTimestamp(invc.hash(), currentTimestamp, timeAuthorityKey);

    console.time('setLimit');
    const limitAmount = UInt32.from(5000);
    const proof1 = await InvoicesProgram.setLimit(
      proof.publicInput,
      proof,
      limitAmount,
      Signature.create(timeAuthorityKey, proof.publicOutput.nonce.toFields().concat(proof.publicInput.creditAccount.toFields()).concat(limitAmount.toFields()))
    );
    console.timeEnd('setLimit');

    console.time('create');
    const createProof = await InvoicesProgram.createInvoice(
      proof.publicInput,
      proof1,
      invc,
      new InvoicesWitness(tree.getWitness(0n)),
      createSign,
      actionTimestamp
    );
    tree.setLeaf(0n, invc.hash());
    console.timeEnd('create');

    console.time('claim');
    const claimTimestamp = UInt32.from(Math.floor(Date.now() / 1000));

    const updatedInvc = invc.access(claimTimestamp);

    const claimActionTimestamp = SignedActionTimestamp.signedTimestamp(updatedInvc.hash(), claimTimestamp, timeAuthorityKey);
    const claimSign = Signature.create(userPrivateKey, invc.hash().toFields());

    const claimProof = await InvoicesProgram.claimInvoice(
      proof.publicInput,
      proof1,
      invc,
      new InvoicesWitness(tree.getWitness(0n)),
      claimSign,
      claimActionTimestamp
    );
    console.time('claim');

    console.time('verify');
    const success = await verify(claimProof, vk.verificationKey);
    console.timeEnd('verify');

    expect(success).toBe(true);
  });
});
