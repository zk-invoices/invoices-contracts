/**
 * In the current implementation of ZkInvoices PoC, to create an invoice, the users requires two accounts. First is native Mina account,
 * and other is InvoicesProvider account. The InvoicesProvider token account seems like an overhead for simpler use-cases which do not want
 * to use applications of Zero Knowledge.
 *
 * With the help of a ZKProgram, I am trying to bring the entry barrier a little low. Such that, the services which do not want to
 * utilise the MINA blockchain, can still get the benefits of the zero knowledge tech.
 *
 * The idea is to let the users signup with traditional signin methods like google, mobile, email or even metamask. And still have a
 * secure way to get benefits of ZK tech.
 */

import { SelfProof, Field, ZkProgram, Struct, MerkleTree, PublicKey, Signature, Provable, UInt32 } from 'o1js';
import { Invoice, InvoicesWitness } from './InvoicesModels.js';

export class InvoicesState extends Struct({
  invoicesRoot: Field,
  usedLimit: UInt32
}) {
  static empty() {
    return new InvoicesState({
      invoicesRoot: Field(0),
      usedLimit: UInt32.from(0)
    });
  }

  static init(invoicesTreeRoot: Field) {
    return new InvoicesState({
      invoicesRoot: invoicesTreeRoot,
      usedLimit: UInt32.from(0)
    });
  }

  create(invoice: Invoice, witness: InvoicesWitness) {
    const newRoot = witness.calculateRoot(invoice.hash());
    const alreadyCreated = newRoot.equals(this.invoicesRoot);
    const isSlotEmpty = witness
      .calculateRoot(Field(0))
      .equals(this.invoicesRoot);

    alreadyCreated.assertFalse('Invoice already created');
    isSlotEmpty.assertTrue('Invoice slot already used');

    return new InvoicesState({
      invoicesRoot: newRoot,
      usedLimit: this.usedLimit.add(invoice.amount)
    });
  }

  claim(invoice: Invoice, witness: InvoicesWitness) {
    const newRoot = witness.calculateRoot(invoice.claim().hash());
    const alreadyClaimed = newRoot.equals(this.invoicesRoot);
    const invoiceExists = witness
      .calculateRoot(invoice.hash())
      .equals(this.invoicesRoot);

    alreadyClaimed.assertFalse('Invoice already claimed');
    invoiceExists.assertTrue('Invoice does not exist');

    return new InvoicesState({
      invoicesRoot: newRoot,
      usedLimit: this.usedLimit.sub(invoice.amount)
    });
  }
}

class InvoicesProgramInput extends Struct({
  state: InvoicesState,
  operator: PublicKey
}) { }

const InvoicesProgram = ZkProgram({
  name: 'invoices-program',
  publicInput: InvoicesProgramInput,
  publicOutput: InvoicesProgramInput,

  methods: {
    init: {
      privateInputs: [Signature],
      method(pubInput: InvoicesProgramInput, sign: Signature) {
        const tree = new MerkleTree(32);

        sign
          .verify(pubInput.operator, Field(0).toFields())
          .assertTrue('Invalid signature provided');

        return { state: InvoicesState.init(tree.getRoot()), operator: pubInput.operator };
      },
    },

    createInvoice: {
      privateInputs: [SelfProof, Invoice, InvoicesWitness, Signature],
      method(
        pubInput: InvoicesProgramInput,
        earlierProof: SelfProof<InvoicesProgramInput, InvoicesProgramInput>,
        invoice: Invoice,
        witness: InvoicesWitness,
        sign: Signature
      ) {
        pubInput.state.invoicesRoot.assertEquals(
          earlierProof.publicOutput.state.invoicesRoot,
          'Roots do not match'
        );

        sign.verify(
          pubInput.operator,
          invoice.hash().toFields(),
        ).assertTrue('Invalid signature provided');


        earlierProof.verify();

        return { state: pubInput.state.create(invoice, witness), operator: pubInput.operator };
      },
    },
  },
});

export default InvoicesProgram;
