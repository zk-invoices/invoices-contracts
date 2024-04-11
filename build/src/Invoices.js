/*
Description:

This example describes how developers can use Merkle Trees as a basic off-chain storage tool.

zkApps on Mina can only store a small amount of data on-chain, but many use cases require your application to at least reference big amounts of data.
Merkle Trees give developers the power of storing large amounts of data off-chain, but proving its integrity to the on-chain smart contract!


! Unfamiliar with Merkle Trees? No problem! Check out https://blog.ethereum.org/2015/11/15/merkling-in-ethereum/
*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { SmartContract, Field, State, state, method, MerkleTree, Struct, Bool, Reducer, Provable, UInt64, UInt32, Permissions, } from 'o1js';
import { Invoice } from './InvoicesModels.js';
import { InvoicesWitness } from './InvoicesModels.js';
// we now need "wrap" the Merkle tree around our off-chain storage
// we initialize a new Merkle Tree with height 8
const initialRoot = new MerkleTree(32).getRoot();
export class InvoiceOperation extends Struct({
    type: Field,
    invoice: Invoice,
    witness: InvoicesWitness,
}) {
    isCreate() {
        return this.type.equals(Field(0));
    }
    isClaim() {
        return this.type.equals(Field(1));
    }
    static create(invoice, witness) {
        return new InvoiceOperation({
            type: Field(0),
            invoice,
            witness,
        });
    }
    static claim(invoice, witness) {
        return new InvoiceOperation({
            type: Field(1),
            invoice,
            witness,
        });
    }
}
export class Invoices extends SmartContract {
    constructor() {
        super(...arguments);
        this.vkHash = State();
        this.commitment = State();
        this.accumulated = State();
        this.limit = State();
        this.usage = State();
        this.events = {
            'invoice-created': Field,
            'invoice-claimed': Field,
            'actions-committed': Field,
        };
        this.reducer = Reducer({ actionType: InvoiceOperation });
    }
    deploy(args) {
        super.deploy(args);
        this.account.permissions.set({
            ...Permissions.default(),
            setDelegate: Permissions.proof(),
            incrementNonce: Permissions.proofOrSignature(),
            setVotingFor: Permissions.proof(),
            setTiming: Permissions.proof(),
            send: Permissions.proofOrSignature(),
            editState: Permissions.signature()
        });
    }
    init() {
        super.init();
        this.accumulated.set(Reducer.initialActionState);
        this.commitment.set(initialRoot);
        this.limit.set(UInt32.from(10000));
        this.usage.set(UInt32.from(0));
    }
    createInvoice(invoice, path) {
        let commit = this.commitment.getAndRequireEquals();
        let currentLimit = this.limit.getAndRequireEquals();
        let currentUsed = this.usage.getAndRequireEquals();
        path
            .calculateRoot(Field(0))
            .equals(commit)
            .assertTrue('The invoice already exists');
        let accumulated = this.accumulated.getAndRequireEquals();
        let pendingActions = this.reducer.getActions({
            fromActionState: accumulated,
        });
        let { state } = this.reducer.reduce(pendingActions, Bool, (state, action) => {
            return Bool(action.isCreate().and(action.invoice.hash().equals(invoice.hash()))).or(state);
        }, { state: Bool(false), actionState: accumulated });
        let { state: usedLimit } = this.reducer.reduce(pendingActions, UInt32, (state, action) => {
            return Provable.if(action.isCreate(), state.add(invoice.amount), state);
        }, { state: currentLimit, actionState: accumulated });
        state.assertFalse('The invoice already exists');
        currentUsed.add(invoice.amount).assertLessThanOrEqual(usedLimit, 'Limit already used');
        this.reducer.dispatch(InvoiceOperation.create(invoice, path));
        this.emitEvent('invoice-created', invoice.id);
    }
    claimInvoice(invoice, path) {
        let commit = this.commitment.getAndRequireEquals();
        let accumulated = this.accumulated.getAndRequireEquals();
        invoice.settled.assertFalse('Invoice is already claimed');
        let isCreateCommitted = path.calculateRoot(invoice.hash()).equals(commit);
        let { state: isCreatePending } = this.reducer.reduce(this.reducer.getActions({ fromActionState: accumulated }), Bool, (state, action) => {
            return Bool(action.isCreate().and(action.invoice.hash().equals(invoice.hash()))).or(state);
        }, { state: Bool(false), actionState: accumulated });
        isCreateCommitted.or(isCreatePending).assertTrue('Invoice not created yet');
        let { state: isClaimPending } = this.reducer.reduce(this.reducer.getActions({ fromActionState: accumulated }), Bool, (state, action) => {
            return Bool(action.isClaim().and(action.invoice.hash().equals(invoice.hash()))).or(state);
        }, { state: Bool(false), actionState: accumulated });
        isClaimPending.assertFalse('Invoice settlement already in queue');
        this.reducer.dispatch(InvoiceOperation.claim(invoice, path));
        this.emitEvent('invoice-claimed', invoice.id);
    }
    commit() {
        let accumulated = this.accumulated.get();
        this.accumulated.requireEquals(accumulated);
        let commitment = this.commitment.get();
        this.commitment.requireEquals(commitment);
        let currentUsage = this.usage.get();
        this.usage.requireEquals(currentUsage);
        let pendingActions = this.reducer.getActions({
            fromActionState: accumulated,
        });
        let { state: newCommitment, actionState: newAccumulated } = this.reducer.reduce(pendingActions, Field, (state, action) => {
            return action.witness.calculateRoot(Provable.if(action.isCreate(), action.invoice.hash(), action.invoice.claim().hash()));
        }, { state: commitment, actionState: accumulated });
        let { state: newUsage } = this.reducer.reduce(pendingActions, UInt32, (state, action) => {
            return Provable.if(action.isCreate(), state.add(action.invoice.amount), state);
        }, { state: currentUsage, actionState: accumulated });
        this.usage.set(newUsage);
        this.commitment.set(newCommitment);
        this.accumulated.set(newAccumulated);
        this.emitEvent('actions-committed', newCommitment);
    }
    increaseLimit(amount) {
        const currentLimit = this.limit.get();
        this.limit.requireEquals(currentLimit);
        this.limit.set(currentLimit.add(amount));
    }
}
__decorate([
    state(Field),
    __metadata("design:type", Object)
], Invoices.prototype, "vkHash", void 0);
__decorate([
    state(Field),
    __metadata("design:type", Object)
], Invoices.prototype, "commitment", void 0);
__decorate([
    state(Field),
    __metadata("design:type", Object)
], Invoices.prototype, "accumulated", void 0);
__decorate([
    state(UInt64),
    __metadata("design:type", Object)
], Invoices.prototype, "limit", void 0);
__decorate([
    state(UInt64),
    __metadata("design:type", Object)
], Invoices.prototype, "usage", void 0);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Invoices.prototype, "init", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Invoice, InvoicesWitness]),
    __metadata("design:returntype", void 0)
], Invoices.prototype, "createInvoice", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Invoice, InvoicesWitness]),
    __metadata("design:returntype", void 0)
], Invoices.prototype, "claimInvoice", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Invoices.prototype, "commit", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UInt32]),
    __metadata("design:returntype", void 0)
], Invoices.prototype, "increaseLimit", null);
//# sourceMappingURL=Invoices.js.map