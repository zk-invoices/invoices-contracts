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
import { SelfProof, Field, ZkProgram, Struct, MerkleTree, PublicKey, Signature, UInt32 } from 'o1js';
import { Invoice, InvoicesWitness } from './InvoicesModels.js';
export class SignedActionTimestamp extends Struct({
    actionHash: Field,
    timestamp: UInt32,
    signature: Signature
}) {
    static signedTimestamp(hash, timestamp, key) {
        return new SignedActionTimestamp({
            actionHash: hash,
            timestamp: timestamp,
            signature: Signature.create(key, [hash].concat(timestamp.toFields()))
        });
    }
    verifyTimestamp(authority) {
        return this.signature.verify(authority, [this.actionHash].concat(this.timestamp.toFields()));
    }
}
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
    static init(invoicesTreeRoot) {
        return new InvoicesState({
            invoicesRoot: invoicesTreeRoot,
            usedLimit: UInt32.from(0)
        });
    }
    create(invoice, witness) {
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
    claim(invoice, timestamp, witness) {
        const invoiceExists = witness
            .calculateRoot(invoice.hash())
            .equals(this.invoicesRoot);
        const newRoot = witness.calculateRoot(invoice.access(timestamp).claim().hash());
        const alreadyClaimed = newRoot.equals(this.invoicesRoot);
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
    operator: PublicKey,
    timeAuthority: PublicKey,
    creditAccount: PublicKey,
    creditAuthority: PublicKey
}) {
}
class InvoicesProgramOutput extends Struct({
    state: InvoicesState,
    nonce: UInt32,
    limit: UInt32,
    claimAmount: UInt32
}) {
}
const InvoicesProgram = ZkProgram({
    name: 'invoices-program',
    publicInput: InvoicesProgramInput,
    publicOutput: InvoicesProgramOutput,
    methods: {
        init: {
            privateInputs: [Signature],
            method(pubInput, sign) {
                const tree = new MerkleTree(32);
                sign
                    .verify(pubInput.operator, Field(0).toFields())
                    .assertTrue('Invalid signature provided');
                return {
                    state: InvoicesState.init(tree.getRoot()),
                    limit: UInt32.from(0),
                    nonce: UInt32.from(1),
                    claimAmount: UInt32.from(0)
                };
            },
        },
        setLimit: {
            privateInputs: [SelfProof, UInt32, Signature],
            method(pubInput, earlierProof, limit, sign) {
                earlierProof.verify();
                sign.verify(pubInput.creditAuthority, earlierProof.publicOutput.nonce.toFields().concat(pubInput.creditAccount.toFields()).concat(limit.toFields()));
                return {
                    state: earlierProof.publicOutput.state,
                    limit: limit,
                    nonce: UInt32.from(1),
                    claimAmount: UInt32.from(0)
                };
            }
        },
        createInvoice: {
            privateInputs: [SelfProof, Invoice, InvoicesWitness, Signature, SignedActionTimestamp],
            method(pubInput, earlierProof, invoice, witness, sign, actionTimestamp) {
                earlierProof.verify();
                const invoiceHash = invoice.hash();
                sign.verify(pubInput.operator, invoiceHash.toFields()).assertTrue('Invalid signature provided');
                actionTimestamp.verifyTimestamp(pubInput.timeAuthority).assertTrue('Invalid timestamp signature');
                actionTimestamp.actionHash.equals(invoiceHash).assertTrue('Invalid invoice hash in timestamp');
                actionTimestamp.timestamp.equals(invoice.createdAt).assertTrue('Invoice createdAt does not match timestamp');
                earlierProof.publicOutput.limit
                    .greaterThanOrEqual(earlierProof.publicOutput.state.usedLimit.add(invoice.amount))
                    .assertTrue('Limit not available');
                return {
                    state: earlierProof.publicOutput.state.create(invoice, witness),
                    limit: earlierProof.publicOutput.limit.sub(invoice.amount),
                    nonce: earlierProof.publicOutput.nonce.add(1),
                    claimAmount: UInt32.from(0)
                };
            },
        },
        claimInvoice: {
            privateInputs: [SelfProof, Invoice, InvoicesWitness, Signature, SignedActionTimestamp],
            method(pubInput, earlierProof, invoice, witness, sign, actionTimestamp) {
                earlierProof.verify();
                const invoiceHash = invoice.hash();
                sign.verify(pubInput.operator, invoiceHash.toFields()).assertTrue('Invalid signature provided');
                actionTimestamp.verifyTimestamp(pubInput.timeAuthority).assertTrue('Invalid timestamp signature');
                actionTimestamp.actionHash.equals(invoice.access(actionTimestamp.timestamp).hash()).assertTrue('Invalid invoice hash in timestamp');
                return {
                    state: earlierProof.publicOutput.state.claim(invoice, actionTimestamp.timestamp, witness),
                    limit: earlierProof.publicOutput.limit,
                    nonce: earlierProof.publicOutput.nonce.add(1),
                    claimAmount: UInt32.from(invoice.amount)
                };
            }
        }
    },
});
export default InvoicesProgram;
//# sourceMappingURL=InvoicesProgram.js.map