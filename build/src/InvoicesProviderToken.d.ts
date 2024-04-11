import { Field, DeployArgs, PublicKey, VerificationKey, UInt32, State, TokenContract, AccountUpdateForest } from 'o1js';
import { Invoice, InvoicesWitness } from './InvoicesModels.js';
import { Invoices } from './Invoices.js';
export declare class InvoicesProviderToken extends TokenContract {
    tokenZkAppVkHash: State<import("o1js/dist/node/lib/field.js").Field>;
    deploy(args: DeployArgs): void;
    approveBase(updates: AccountUpdateForest): void;
    upgradeRoot(vKey: VerificationKey): void;
    mint(address: PublicKey, vk: VerificationKey, initialRoot: Field): void;
    upgrade(address: PublicKey, vk: VerificationKey): void;
    createInvoice(address: PublicKey, invoice: Invoice, path: InvoicesWitness): void;
    claimInvoice(address: PublicKey, invoice: Invoice, path: InvoicesWitness): void;
    commit(address: PublicKey): void;
    increaseLimit(address: PublicKey, amount: UInt32): void;
    getZkAppAccount(address: PublicKey): Invoices;
}
