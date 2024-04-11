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
import { SelfProof, Field, PublicKey, Signature, UInt32, PrivateKey } from 'o1js';
import { Invoice, InvoicesWitness } from './InvoicesModels.js';
declare const SignedActionTimestamp_base: (new (value: {
    actionHash: import("o1js/dist/node/lib/field.js").Field;
    timestamp: UInt32;
    signature: Signature;
}) => {
    actionHash: import("o1js/dist/node/lib/field.js").Field;
    timestamp: UInt32;
    signature: Signature;
}) & {
    _isStruct: true;
} & import("o1js/dist/node/snarky.js").ProvablePure<{
    actionHash: import("o1js/dist/node/lib/field.js").Field;
    timestamp: UInt32;
    signature: Signature;
}> & {
    toInput: (x: {
        actionHash: import("o1js/dist/node/lib/field.js").Field;
        timestamp: UInt32;
        signature: Signature;
    }) => {
        fields?: import("o1js/dist/node/lib/field.js").Field[] | undefined;
        packed?: [import("o1js/dist/node/lib/field.js").Field, number][] | undefined;
    };
    toJSON: (x: {
        actionHash: import("o1js/dist/node/lib/field.js").Field;
        timestamp: UInt32;
        signature: Signature;
    }) => {
        actionHash: string;
        timestamp: string;
        signature: any;
    };
    fromJSON: (x: {
        actionHash: string;
        timestamp: string;
        signature: any;
    }) => {
        actionHash: import("o1js/dist/node/lib/field.js").Field;
        timestamp: UInt32;
        signature: Signature;
    };
    empty: () => {
        actionHash: import("o1js/dist/node/lib/field.js").Field;
        timestamp: UInt32;
        signature: Signature;
    };
};
export declare class SignedActionTimestamp extends SignedActionTimestamp_base {
    static signedTimestamp(hash: Field, timestamp: UInt32, key: PrivateKey): SignedActionTimestamp;
    verifyTimestamp(authority: PublicKey): import("o1js/dist/node/lib/bool.js").Bool;
}
declare const InvoicesState_base: (new (value: {
    invoicesRoot: import("o1js/dist/node/lib/field.js").Field;
    usedLimit: UInt32;
}) => {
    invoicesRoot: import("o1js/dist/node/lib/field.js").Field;
    usedLimit: UInt32;
}) & {
    _isStruct: true;
} & import("o1js/dist/node/snarky.js").ProvablePure<{
    invoicesRoot: import("o1js/dist/node/lib/field.js").Field;
    usedLimit: UInt32;
}> & {
    toInput: (x: {
        invoicesRoot: import("o1js/dist/node/lib/field.js").Field;
        usedLimit: UInt32;
    }) => {
        fields?: import("o1js/dist/node/lib/field.js").Field[] | undefined;
        packed?: [import("o1js/dist/node/lib/field.js").Field, number][] | undefined;
    };
    toJSON: (x: {
        invoicesRoot: import("o1js/dist/node/lib/field.js").Field;
        usedLimit: UInt32;
    }) => {
        invoicesRoot: string;
        usedLimit: string;
    };
    fromJSON: (x: {
        invoicesRoot: string;
        usedLimit: string;
    }) => {
        invoicesRoot: import("o1js/dist/node/lib/field.js").Field;
        usedLimit: UInt32;
    };
    empty: () => {
        invoicesRoot: import("o1js/dist/node/lib/field.js").Field;
        usedLimit: UInt32;
    };
};
export declare class InvoicesState extends InvoicesState_base {
    static empty(): InvoicesState;
    static init(invoicesTreeRoot: Field): InvoicesState;
    create(invoice: Invoice, witness: InvoicesWitness): InvoicesState;
    claim(invoice: Invoice, timestamp: UInt32, witness: InvoicesWitness): InvoicesState;
}
declare const InvoicesProgramInput_base: (new (value: {
    state: InvoicesState;
    operator: PublicKey;
    timeAuthority: PublicKey;
    creditAccount: PublicKey;
    creditAuthority: PublicKey;
}) => {
    state: InvoicesState;
    operator: PublicKey;
    timeAuthority: PublicKey;
    creditAccount: PublicKey;
    creditAuthority: PublicKey;
}) & {
    _isStruct: true;
} & import("o1js/dist/node/snarky.js").ProvablePure<{
    state: InvoicesState;
    operator: PublicKey;
    timeAuthority: PublicKey;
    creditAccount: PublicKey;
    creditAuthority: PublicKey;
}> & {
    toInput: (x: {
        state: InvoicesState;
        operator: PublicKey;
        timeAuthority: PublicKey;
        creditAccount: PublicKey;
        creditAuthority: PublicKey;
    }) => {
        fields?: import("o1js/dist/node/lib/field.js").Field[] | undefined;
        packed?: [import("o1js/dist/node/lib/field.js").Field, number][] | undefined;
    };
    toJSON: (x: {
        state: InvoicesState;
        operator: PublicKey;
        timeAuthority: PublicKey;
        creditAccount: PublicKey;
        creditAuthority: PublicKey;
    }) => {
        state: {
            invoicesRoot: string;
            usedLimit: string;
        };
        operator: string;
        timeAuthority: string;
        creditAccount: string;
        creditAuthority: string;
    };
    fromJSON: (x: {
        state: {
            invoicesRoot: string;
            usedLimit: string;
        };
        operator: string;
        timeAuthority: string;
        creditAccount: string;
        creditAuthority: string;
    }) => {
        state: InvoicesState;
        operator: PublicKey;
        timeAuthority: PublicKey;
        creditAccount: PublicKey;
        creditAuthority: PublicKey;
    };
    empty: () => {
        state: InvoicesState;
        operator: PublicKey;
        timeAuthority: PublicKey;
        creditAccount: PublicKey;
        creditAuthority: PublicKey;
    };
};
declare class InvoicesProgramInput extends InvoicesProgramInput_base {
}
declare const InvoicesProgramOutput_base: (new (value: {
    state: InvoicesState;
    nonce: UInt32;
    limit: UInt32;
    claimAmount: UInt32;
}) => {
    state: InvoicesState;
    nonce: UInt32;
    limit: UInt32;
    claimAmount: UInt32;
}) & {
    _isStruct: true;
} & import("o1js/dist/node/snarky.js").ProvablePure<{
    state: InvoicesState;
    nonce: UInt32;
    limit: UInt32;
    claimAmount: UInt32;
}> & {
    toInput: (x: {
        state: InvoicesState;
        nonce: UInt32;
        limit: UInt32;
        claimAmount: UInt32;
    }) => {
        fields?: import("o1js/dist/node/lib/field.js").Field[] | undefined;
        packed?: [import("o1js/dist/node/lib/field.js").Field, number][] | undefined;
    };
    toJSON: (x: {
        state: InvoicesState;
        nonce: UInt32;
        limit: UInt32;
        claimAmount: UInt32;
    }) => {
        state: {
            invoicesRoot: string;
            usedLimit: string;
        };
        nonce: string;
        limit: string;
        claimAmount: string;
    };
    fromJSON: (x: {
        state: {
            invoicesRoot: string;
            usedLimit: string;
        };
        nonce: string;
        limit: string;
        claimAmount: string;
    }) => {
        state: InvoicesState;
        nonce: UInt32;
        limit: UInt32;
        claimAmount: UInt32;
    };
    empty: () => {
        state: InvoicesState;
        nonce: UInt32;
        limit: UInt32;
        claimAmount: UInt32;
    };
};
declare class InvoicesProgramOutput extends InvoicesProgramOutput_base {
}
declare const InvoicesProgram: {
    name: string;
    compile: (options?: {
        cache?: import("o1js/dist/node/lib/proof-system/cache.js").Cache | undefined;
        forceRecompile?: boolean | undefined;
    } | undefined) => Promise<{
        verificationKey: {
            data: string;
            hash: import("o1js/dist/node/lib/field.js").Field;
        };
    }>;
    verify: (proof: import("o1js/dist/node/lib/proof-system.js").Proof<InvoicesProgramInput, InvoicesProgramOutput>) => Promise<boolean>;
    digest: () => string;
    analyzeMethods: () => {
        init: {
            rows: number;
            digest: string;
            result: unknown;
            gates: import("o1js/dist/node/snarky.js").Gate[];
            publicInputSize: number;
            print(): void;
            summary(): Partial<Record<import("o1js/dist/node/snarky.js").GateType | "Total rows", number>>;
        };
        setLimit: {
            rows: number;
            digest: string;
            result: unknown;
            gates: import("o1js/dist/node/snarky.js").Gate[];
            publicInputSize: number;
            print(): void;
            summary(): Partial<Record<import("o1js/dist/node/snarky.js").GateType | "Total rows", number>>;
        };
        createInvoice: {
            rows: number;
            digest: string;
            result: unknown;
            gates: import("o1js/dist/node/snarky.js").Gate[];
            publicInputSize: number;
            print(): void;
            summary(): Partial<Record<import("o1js/dist/node/snarky.js").GateType | "Total rows", number>>;
        };
        claimInvoice: {
            rows: number;
            digest: string;
            result: unknown;
            gates: import("o1js/dist/node/snarky.js").Gate[];
            publicInputSize: number;
            print(): void;
            summary(): Partial<Record<import("o1js/dist/node/snarky.js").GateType | "Total rows", number>>;
        };
    };
    publicInputType: typeof InvoicesProgramInput;
    publicOutputType: typeof InvoicesProgramOutput;
    privateInputTypes: {
        init: [typeof Signature];
        setLimit: [typeof SelfProof, typeof UInt32, typeof Signature];
        createInvoice: [typeof SelfProof, typeof Invoice, typeof InvoicesWitness, typeof Signature, typeof SignedActionTimestamp];
        claimInvoice: [typeof SelfProof, typeof Invoice, typeof InvoicesWitness, typeof Signature, typeof SignedActionTimestamp];
    };
    rawMethods: {
        init: (publicInput: InvoicesProgramInput, ...args: [Signature] & any[]) => InvoicesProgramOutput;
        setLimit: (publicInput: InvoicesProgramInput, ...args: [SelfProof<unknown, unknown>, UInt32, Signature] & any[]) => InvoicesProgramOutput;
        createInvoice: (publicInput: InvoicesProgramInput, ...args: [SelfProof<unknown, unknown>, Invoice, InvoicesWitness, Signature, SignedActionTimestamp] & any[]) => InvoicesProgramOutput;
        claimInvoice: (publicInput: InvoicesProgramInput, ...args: [SelfProof<unknown, unknown>, Invoice, InvoicesWitness, Signature, SignedActionTimestamp] & any[]) => InvoicesProgramOutput;
    };
} & {
    init: (publicInput: InvoicesProgramInput, ...args: [Signature] & any[]) => Promise<import("o1js/dist/node/lib/proof-system.js").Proof<InvoicesProgramInput, InvoicesProgramOutput>>;
    setLimit: (publicInput: InvoicesProgramInput, ...args: [SelfProof<unknown, unknown>, UInt32, Signature] & any[]) => Promise<import("o1js/dist/node/lib/proof-system.js").Proof<InvoicesProgramInput, InvoicesProgramOutput>>;
    createInvoice: (publicInput: InvoicesProgramInput, ...args: [SelfProof<unknown, unknown>, Invoice, InvoicesWitness, Signature, SignedActionTimestamp] & any[]) => Promise<import("o1js/dist/node/lib/proof-system.js").Proof<InvoicesProgramInput, InvoicesProgramOutput>>;
    claimInvoice: (publicInput: InvoicesProgramInput, ...args: [SelfProof<unknown, unknown>, Invoice, InvoicesWitness, Signature, SignedActionTimestamp] & any[]) => Promise<import("o1js/dist/node/lib/proof-system.js").Proof<InvoicesProgramInput, InvoicesProgramOutput>>;
};
export default InvoicesProgram;
