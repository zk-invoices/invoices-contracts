var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Field, AccountUpdate, Bool, PublicKey, VerificationKey, Permissions, method, Reducer, Account, UInt32, State, state, TokenContract, AccountUpdateForest, Provable } from 'o1js';
import { Invoice, InvoicesWitness } from './InvoicesModels.js';
import { Invoices } from './Invoices.js';
export class InvoicesProviderToken extends TokenContract {
    constructor() {
        super(...arguments);
        this.tokenZkAppVkHash = State();
    }
    deploy(args) {
        super.deploy(args);
        this.account.permissions.set({
            ...Permissions.default(),
            setDelegate: Permissions.proof(),
            incrementNonce: Permissions.proofOrSignature(),
            setVotingFor: Permissions.proof(),
            setTiming: Permissions.proof(),
            send: Permissions.proofOrSignature()
        });
    }
    approveBase(updates) {
        // TODO: Add some sort of verification for account updates
        this.checkZeroBalanceChange(updates);
    }
    upgradeRoot(vKey) {
        this.tokenZkAppVkHash.getAndRequireEquals();
        this.tokenZkAppVkHash.set(vKey.hash);
    }
    mint(address, vk, initialRoot) {
        const isNewAccount = Account(address, this.token.id).isNew.getAndRequireEquals();
        isNewAccount.assertTrue('Token already minted');
        const zkAppVerificationKeyHash = this.tokenZkAppVkHash.getAndRequireEquals();
        vk.hash.assertEquals(zkAppVerificationKeyHash, 'Verification key hash does not match');
        this.token.mint({ address, amount: 1 });
        const update = AccountUpdate.createSigned(address, this.token.id);
        update.body.update.verificationKey = { isSome: Bool(true), value: vk };
        update.body.update.permissions = {
            isSome: Bool(true),
            value: {
                ...Permissions.default(),
                setDelegate: Permissions.proof(),
                incrementNonce: Permissions.proofOrSignature(),
                setVotingFor: Permissions.proof(),
                setTiming: Permissions.proof(),
                send: Permissions.proofOrSignature()
            },
        };
        update.body.update.appState = [
            { isSome: Bool(true), value: vk.hash },
            { isSome: Bool(true), value: initialRoot },
            { isSome: Bool(true), value: Reducer.initialActionState },
            { isSome: Bool(true), value: Field.from(0) },
            { isSome: Bool(true), value: Field.from(0) },
            { isSome: Bool(true), value: Field(0) },
            { isSome: Bool(true), value: Field(0) },
            { isSome: Bool(true), value: Field(0) },
        ];
    }
    upgrade(address, vk) {
        const update = AccountUpdate.createSigned(address, this.token.id);
        const zkAppHash = this.tokenZkAppVkHash.getAndRequireEquals();
        vk.hash.assertEquals(zkAppHash, 'Verification key hash does not match');
        update.body.update.verificationKey = { isSome: Bool(true), value: vk };
        const appStateUpdates = new Array(8);
        appStateUpdates[0] = { isSome: Bool(true), value: vk.hash };
    }
    createInvoice(address, invoice, path) {
        const zkAppTokenAccount = this.getZkAppAccount(address);
        zkAppTokenAccount.createInvoice(invoice, path);
        this.approveAccountUpdate(zkAppTokenAccount.self);
    }
    claimInvoice(address, invoice, path) {
        const zkAppTokenAccount = this.getZkAppAccount(address);
        zkAppTokenAccount.claimInvoice(invoice, path);
        this.approveAccountUpdate(zkAppTokenAccount.self);
    }
    commit(address) {
        const zkAppTokenAccount = this.getZkAppAccount(address);
        zkAppTokenAccount.commit();
        this.approveAccountUpdate(zkAppTokenAccount.self);
    }
    increaseLimit(address, amount) {
        const zkAppTokenAccount = this.getZkAppAccount(address);
        zkAppTokenAccount.increaseLimit(amount);
        Provable.log(zkAppTokenAccount.self);
        this.approveAccountUpdate(zkAppTokenAccount.self);
    }
    getZkAppAccount(address) {
        const zkAppTokenAccount = new Invoices(address, this.token.id);
        const zkAppHash = zkAppTokenAccount.vkHash.getAndRequireEquals();
        const providerTokenAppHash = this.tokenZkAppVkHash.getAndRequireEquals();
        zkAppHash.assertEquals(providerTokenAppHash, 'Token app mismatch, update the verification key');
        return zkAppTokenAccount;
    }
}
__decorate([
    state(Field),
    __metadata("design:type", Object)
], InvoicesProviderToken.prototype, "tokenZkAppVkHash", void 0);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AccountUpdateForest]),
    __metadata("design:returntype", void 0)
], InvoicesProviderToken.prototype, "approveBase", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerificationKey]),
    __metadata("design:returntype", void 0)
], InvoicesProviderToken.prototype, "upgradeRoot", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey, VerificationKey, Field]),
    __metadata("design:returntype", void 0)
], InvoicesProviderToken.prototype, "mint", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey, VerificationKey]),
    __metadata("design:returntype", void 0)
], InvoicesProviderToken.prototype, "upgrade", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey, Invoice, InvoicesWitness]),
    __metadata("design:returntype", void 0)
], InvoicesProviderToken.prototype, "createInvoice", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey, Invoice, InvoicesWitness]),
    __metadata("design:returntype", void 0)
], InvoicesProviderToken.prototype, "claimInvoice", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey]),
    __metadata("design:returntype", void 0)
], InvoicesProviderToken.prototype, "commit", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey, UInt32]),
    __metadata("design:returntype", void 0)
], InvoicesProviderToken.prototype, "increaseLimit", null);
//# sourceMappingURL=InvoicesProviderToken.js.map