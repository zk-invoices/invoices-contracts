import { Field, SmartContract, DeployArgs, PublicKey, VerificationKey, UInt32, State } from 'o1js';
import { Invoice, InvoicesWitness } from './InvoicesModels.js';
import { Invoices } from './Invoices.js';
export declare class InvoicesProvider extends SmartContract {
    tokenZkAppVkHash: State<import("o1js/dist/node/lib/field.js").Field>;
    deploy(args: DeployArgs): void;
    upgradeRoot(vKey: VerificationKey): void;
    mint(address: PublicKey, vk: VerificationKey, initialRoot: Field): void;
    upgrade(address: PublicKey, vk: VerificationKey): void;
    createInvoice(address: PublicKey, invoice: Invoice, path: InvoicesWitness): void;
    settleInvoice(address: PublicKey, invoice: Invoice, path: InvoicesWitness): void;
    commit(address: PublicKey): void;
    increaseLimit(address: PublicKey, amount: UInt32): void;
    getZkAppAccount(address: PublicKey): Invoices;
}
