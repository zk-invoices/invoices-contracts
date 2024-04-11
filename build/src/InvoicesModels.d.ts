import { Field, PublicKey, UInt32 } from 'o1js';
declare const InvoicesWitness_base: typeof import("o1js/dist/node/lib/merkle-tree").BaseMerkleWitness;
export declare class InvoicesWitness extends InvoicesWitness_base {
}
declare const InvoiceCartWiteness_base: typeof import("o1js/dist/node/lib/merkle-tree").BaseMerkleWitness;
export declare class InvoiceCartWiteness extends InvoiceCartWiteness_base {
}
declare const CartItem_base: (new (value: {
    id: import("o1js/dist/node/lib/field").Field;
    price: UInt32;
    quantity: UInt32;
}) => {
    id: import("o1js/dist/node/lib/field").Field;
    price: UInt32;
    quantity: UInt32;
}) & {
    _isStruct: true;
} & import("o1js/dist/node/snarky").ProvablePure<{
    id: import("o1js/dist/node/lib/field").Field;
    price: UInt32;
    quantity: UInt32;
}> & {
    toInput: (x: {
        id: import("o1js/dist/node/lib/field").Field;
        price: UInt32;
        quantity: UInt32;
    }) => {
        fields?: import("o1js/dist/node/lib/field").Field[] | undefined;
        packed?: [import("o1js/dist/node/lib/field").Field, number][] | undefined;
    };
    toJSON: (x: {
        id: import("o1js/dist/node/lib/field").Field;
        price: UInt32;
        quantity: UInt32;
    }) => {
        id: string;
        price: string;
        quantity: string;
    };
    fromJSON: (x: {
        id: string;
        price: string;
        quantity: string;
    }) => {
        id: import("o1js/dist/node/lib/field").Field;
        price: UInt32;
        quantity: UInt32;
    };
    empty: () => {
        id: import("o1js/dist/node/lib/field").Field;
        price: UInt32;
        quantity: UInt32;
    };
};
export declare class CartItem extends CartItem_base {
    hash(): import("o1js/dist/node/lib/field").Field;
}
declare const InvoiceCart_base: (new (value: {
    root: import("o1js/dist/node/lib/field").Field;
    total: UInt32;
    items: UInt32;
}) => {
    root: import("o1js/dist/node/lib/field").Field;
    total: UInt32;
    items: UInt32;
}) & {
    _isStruct: true;
} & import("o1js/dist/node/snarky").ProvablePure<{
    root: import("o1js/dist/node/lib/field").Field;
    total: UInt32;
    items: UInt32;
}> & {
    toInput: (x: {
        root: import("o1js/dist/node/lib/field").Field;
        total: UInt32;
        items: UInt32;
    }) => {
        fields?: import("o1js/dist/node/lib/field").Field[] | undefined;
        packed?: [import("o1js/dist/node/lib/field").Field, number][] | undefined;
    };
    toJSON: (x: {
        root: import("o1js/dist/node/lib/field").Field;
        total: UInt32;
        items: UInt32;
    }) => {
        root: string;
        total: string;
        items: string;
    };
    fromJSON: (x: {
        root: string;
        total: string;
        items: string;
    }) => {
        root: import("o1js/dist/node/lib/field").Field;
        total: UInt32;
        items: UInt32;
    };
    empty: () => {
        root: import("o1js/dist/node/lib/field").Field;
        total: UInt32;
        items: UInt32;
    };
};
export declare class InvoiceCart extends InvoiceCart_base {
    addItem(item: CartItem, itemWitness: InvoiceCartWiteness): void;
}
declare const Invoice_base: (new (value: {
    id: import("o1js/dist/node/lib/field").Field;
    seller: PublicKey;
    buyer: PublicKey;
    amount: UInt32;
    settled: import("o1js/dist/node/lib/bool").Bool;
    metadataHash: import("o1js/dist/node/lib/field").Field;
    itemsRoot: import("o1js/dist/node/lib/field").Field;
    dueDate: UInt32;
    createdAt: UInt32;
    updatedAt: UInt32;
}) => {
    id: import("o1js/dist/node/lib/field").Field;
    seller: PublicKey;
    buyer: PublicKey;
    amount: UInt32;
    settled: import("o1js/dist/node/lib/bool").Bool;
    metadataHash: import("o1js/dist/node/lib/field").Field;
    itemsRoot: import("o1js/dist/node/lib/field").Field;
    dueDate: UInt32;
    createdAt: UInt32;
    updatedAt: UInt32;
}) & {
    _isStruct: true;
} & import("o1js/dist/node/snarky").ProvablePure<{
    id: import("o1js/dist/node/lib/field").Field;
    seller: PublicKey;
    buyer: PublicKey;
    amount: UInt32;
    settled: import("o1js/dist/node/lib/bool").Bool;
    metadataHash: import("o1js/dist/node/lib/field").Field;
    itemsRoot: import("o1js/dist/node/lib/field").Field;
    dueDate: UInt32;
    createdAt: UInt32;
    updatedAt: UInt32;
}> & {
    toInput: (x: {
        id: import("o1js/dist/node/lib/field").Field;
        seller: PublicKey;
        buyer: PublicKey;
        amount: UInt32;
        settled: import("o1js/dist/node/lib/bool").Bool;
        metadataHash: import("o1js/dist/node/lib/field").Field;
        itemsRoot: import("o1js/dist/node/lib/field").Field;
        dueDate: UInt32;
        createdAt: UInt32;
        updatedAt: UInt32;
    }) => {
        fields?: import("o1js/dist/node/lib/field").Field[] | undefined;
        packed?: [import("o1js/dist/node/lib/field").Field, number][] | undefined;
    };
    toJSON: (x: {
        id: import("o1js/dist/node/lib/field").Field;
        seller: PublicKey;
        buyer: PublicKey;
        amount: UInt32;
        settled: import("o1js/dist/node/lib/bool").Bool;
        metadataHash: import("o1js/dist/node/lib/field").Field;
        itemsRoot: import("o1js/dist/node/lib/field").Field;
        dueDate: UInt32;
        createdAt: UInt32;
        updatedAt: UInt32;
    }) => {
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
    fromJSON: (x: {
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
    }) => {
        id: import("o1js/dist/node/lib/field").Field;
        seller: PublicKey;
        buyer: PublicKey;
        amount: UInt32;
        settled: import("o1js/dist/node/lib/bool").Bool;
        metadataHash: import("o1js/dist/node/lib/field").Field;
        itemsRoot: import("o1js/dist/node/lib/field").Field;
        dueDate: UInt32;
        createdAt: UInt32;
        updatedAt: UInt32;
    };
    empty: () => {
        id: import("o1js/dist/node/lib/field").Field;
        seller: PublicKey;
        buyer: PublicKey;
        amount: UInt32;
        settled: import("o1js/dist/node/lib/bool").Bool;
        metadataHash: import("o1js/dist/node/lib/field").Field;
        itemsRoot: import("o1js/dist/node/lib/field").Field;
        dueDate: UInt32;
        createdAt: UInt32;
        updatedAt: UInt32;
    };
};
export declare class Invoice extends Invoice_base {
    hash(): Field;
    access(timestamp: UInt32): Invoice;
    claim(): Invoice;
}
export {};
