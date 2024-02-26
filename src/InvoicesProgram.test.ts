import { Field, MerkleTree, UInt32, PrivateKey, Bool, verify } from 'o1js';
import { Invoice, InvoicesWitness } from './InvoicesModels.js';

import InvoicesProgram, { InvoicesState } from './InvoicesProgram.js';

describe('InvoicesProgram', () => {
  it('test basic functions', async () => {
    console.log('start');

    console.time('compile');
    const vk = await InvoicesProgram.compile();
    console.timeEnd('compile');

    console.time('init');
    const proof = await InvoicesProgram.init(InvoicesState.empty());
    console.timeEnd('init');

    const tree = new MerkleTree(32);
    const sender = PrivateKey.random();
    const receiver = PrivateKey.random();

    const invc = new Invoice({
      id: Field(1),
      dueDate: UInt32.from(Math.floor(Date.now() / 1000)),
      from: sender.toPublicKey(),
      to: receiver.toPublicKey(),
      amount: UInt32.from(1),
      settled: Bool(false),
      metadataHash: Field(0),
    });

    console.time('create');
    const proof1 = await InvoicesProgram.createInvoice(
      proof.publicOutput,
      proof,
      invc,
      new InvoicesWitness(tree.getWitness(0n))
    );
    console.timeEnd('create');

    console.time('verify');
    const success = await verify(proof1, vk.verificationKey);
    console.timeEnd('verify');

    expect(success).toBe(true);
  });
});
