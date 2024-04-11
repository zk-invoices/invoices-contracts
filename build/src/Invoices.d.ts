import { SmartContract, State, Provable, UInt32, DeployArgs } from 'o1js';
import { Invoice } from './InvoicesModels.js';
import { InvoicesWitness } from './InvoicesModels.js';
declare const InvoiceOperation_base: (new (value: {
    type: import("o1js/dist/node/lib/field.js").Field;
    invoice: Invoice;
    witness: InvoicesWitness;
}) => {
    type: import("o1js/dist/node/lib/field.js").Field;
    invoice: Invoice;
    witness: InvoicesWitness;
}) & {
    _isStruct: true;
} & import("o1js/dist/node/snarky.js").ProvablePure<{
    type: import("o1js/dist/node/lib/field.js").Field;
    invoice: Invoice;
    witness: InvoicesWitness;
}> & {
    toInput: (x: {
        type: import("o1js/dist/node/lib/field.js").Field;
        invoice: Invoice;
        witness: InvoicesWitness;
    }) => {
        fields?: import("o1js/dist/node/lib/field.js").Field[] | undefined;
        packed?: [import("o1js/dist/node/lib/field.js").Field, number][] | undefined;
    };
    toJSON: (x: {
        type: import("o1js/dist/node/lib/field.js").Field;
        invoice: Invoice;
        witness: InvoicesWitness;
    }) => {
        type: string;
        invoice: {
            id: string;
            seller: string;
            buyer: string;
            amount: string;
            settled: boolean;
            metadataHash: string;
            itemsRoot: string;
            dueDate: string;
            createdAt: string;
            updatedAt: string;
        };
        witness: any;
    };
    fromJSON: (x: {
        type: string;
        invoice: {
            id: string;
            seller: string;
            buyer: string;
            amount: string;
            settled: boolean;
            metadataHash: string;
            itemsRoot: string;
            dueDate: string;
            createdAt: string;
            updatedAt: string;
        };
        witness: any;
    }) => {
        type: import("o1js/dist/node/lib/field.js").Field;
        invoice: Invoice;
        witness: InvoicesWitness;
    };
    empty: () => {
        type: import("o1js/dist/node/lib/field.js").Field;
        invoice: Invoice;
        witness: InvoicesWitness;
    };
};
export declare class InvoiceOperation extends InvoiceOperation_base {
    isCreate(): import("o1js/dist/node/lib/bool.js").Bool;
    isClaim(): import("o1js/dist/node/lib/bool.js").Bool;
    static create(invoice: Invoice, witness: InvoicesWitness): InvoiceOperation;
    static claim(invoice: Invoice, witness: InvoicesWitness): InvoiceOperation;
}
export declare class Invoices extends SmartContract {
    vkHash: State<import("o1js/dist/node/lib/field.js").Field>;
    commitment: State<import("o1js/dist/node/lib/field.js").Field>;
    accumulated: State<import("o1js/dist/node/lib/field.js").Field>;
    limit: State<UInt32>;
    usage: State<UInt32>;
    events: {
        'invoice-created': typeof import("o1js/dist/node/lib/field.js").Field & ((x: string | number | bigint | import("o1js/dist/node/lib/field.js").Field | import("o1js/dist/node/lib/field.js").FieldVar | import("o1js/dist/node/lib/field.js").FieldConst) => import("o1js/dist/node/lib/field.js").Field);
        'invoice-claimed': typeof import("o1js/dist/node/lib/field.js").Field & ((x: string | number | bigint | import("o1js/dist/node/lib/field.js").Field | import("o1js/dist/node/lib/field.js").FieldVar | import("o1js/dist/node/lib/field.js").FieldConst) => import("o1js/dist/node/lib/field.js").Field);
        'actions-committed': typeof import("o1js/dist/node/lib/field.js").Field & ((x: string | number | bigint | import("o1js/dist/node/lib/field.js").Field | import("o1js/dist/node/lib/field.js").FieldVar | import("o1js/dist/node/lib/field.js").FieldConst) => import("o1js/dist/node/lib/field.js").Field);
    };
    reducer: {
        dispatch(action: InvoiceOperation): void;
        reduce<State_1>(actions: InvoiceOperation[][], stateType: Provable<State_1>, reduce: (state: State_1, action: InvoiceOperation) => State_1, initial: {
            state: State_1;
            actionState: import("o1js/dist/node/lib/field.js").Field;
        }, options?: {
            maxTransactionsWithActions?: number | undefined;
            skipActionStatePrecondition?: boolean | undefined;
        } | undefined): {
            state: State_1;
            actionState: import("o1js/dist/node/lib/field.js").Field;
        };
        forEach(actions: InvoiceOperation[][], reduce: (action: InvoiceOperation) => void, fromActionState: import("o1js/dist/node/lib/field.js").Field, options?: {
            maxTransactionsWithActions?: number | undefined;
            skipActionStatePrecondition?: boolean | undefined;
        } | undefined): import("o1js/dist/node/lib/field.js").Field;
        getActions({ fromActionState, endActionState, }?: {
            fromActionState?: import("o1js/dist/node/lib/field.js").Field | undefined;
            endActionState?: import("o1js/dist/node/lib/field.js").Field | undefined;
        } | undefined): InvoiceOperation[][];
        fetchActions({ fromActionState, endActionState, }: {
            fromActionState?: import("o1js/dist/node/lib/field.js").Field | undefined;
            endActionState?: import("o1js/dist/node/lib/field.js").Field | undefined;
        }): Promise<InvoiceOperation[][]>;
    };
    deploy(args: DeployArgs): void;
    init(): void;
    createInvoice(invoice: Invoice, path: InvoicesWitness): void;
    claimInvoice(invoice: Invoice, path: InvoicesWitness): void;
    commit(): void;
    increaseLimit(amount: UInt32): void;
}
export {};
