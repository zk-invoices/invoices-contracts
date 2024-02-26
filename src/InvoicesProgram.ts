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


import { SelfProof, Field, ZkProgram, Struct, MerkleTree } from 'o1js';
import { Invoice, InvoicesWitness } from './InvoicesModels';

class InvoicesState extends Struct({
  invoicesRoot: Field
}) {
  static init(invoicesTreeRoot: Field) {
    return new InvoicesState({
      invoicesRoot: invoicesTreeRoot
    })
  }

  create(invoice: Invoice, witness: InvoicesWitness) {
    const newRoot = witness.calculateRoot(invoice.hash());
    const alreadyCreated = newRoot.equals(this.invoicesRoot);
    const isSlotEmpty = witness.calculateRoot(Field(0)).equals(this.invoicesRoot);

    alreadyCreated.assertFalse('Invoice already created');
    isSlotEmpty.assertTrue('Invoice slot already used');

    return new InvoicesState({
      invoicesRoot: newRoot
    });
  }

  claim(invoice: Invoice, witness: InvoicesWitness) {
    const newRoot = witness.calculateRoot(invoice.claim().hash());
    const alreadyClaimed = newRoot.equals(this.invoicesRoot);
    const invoiceExists = witness.calculateRoot(invoice.hash()).equals(this.invoicesRoot);

    alreadyClaimed.assertFalse('Invoice already claimed');
    invoiceExists.assertTrue('Invoice does not exist');

    return new InvoicesState({
      invoicesRoot: newRoot
    });
  }
}

const InvoicesProgram = ZkProgram({
  name: "invoices-program",
  publicInput: InvoicesState,

  methods: {
    init: {
      privateInputs: [],
      method() {
        const tree = new MerkleTree(32);

        return InvoicesState.init(tree.getRoot());
      },
    },

    createInvoice: {
      privateInputs: [SelfProof, Invoice, InvoicesWitness],
      method(state: InvoicesState, earlierProof: SelfProof<InvoicesState, InvoicesState>, invoice: Invoice, witness: InvoicesWitness) {
        state.invoicesRoot.assertEquals(earlierProof.publicOutput.invoicesRoot, 'Roots do not match');

        return state.create(invoice, witness);
      },
    },
  },
});

export default InvoicesProgram;