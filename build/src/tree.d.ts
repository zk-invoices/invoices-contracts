import { Bool, Field } from "o1js";
export { Witness, Store, LocalStore, PersistentMerkleTree, BaseMerkleWitness };
export { maybeSwap };
type Witness = {
    isLeft: boolean;
    sibling: Field;
}[];
interface Store {
    getNode(legel: number, index: bigint, _default: Field): Promise<Field>;
    setNode(level: number, index: bigint, value: Field): void;
}
declare class LocalStore implements Store {
    private nodes;
    /**
     * Returns a node which lives at a given index and level.
     * @param level Level of the node.
     * @param index Index of the node.
     * @returns The data of the node.
     */
    getNode(level: number, index: bigint, _default: Field): Promise<Field>;
    setNode(level: number, index: bigint, value: Field): Promise<import("o1js/dist/node/lib/field").Field>;
}
/**
 * A [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree) is a binary tree in which every leaf is the cryptography hash of a piece of data,
 * and every node is the hash of the concatenation of its two child nodes.
 *
 * A Merkle Tree allows developers to easily and securely verify the integrity of large amounts of data.
 *
 * Take a look at our [documentation](https://docs.minaprotocol.com/en/zkapps) on how to use Merkle Trees in combination with zkApps and zero knowledge programming!
 *
 * Levels are indexed from leaves (level 0) to root (level N - 1).
 */
export default class PersistentMerkleTree {
    readonly height: number;
    private store;
    private zeroes;
    /**
     * Creates a new, empty [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree).
     * @param height The height of Merkle Tree.
     * @returns A new MerkleTree
     */
    constructor(height: number, _store: Store);
    /**
     * Returns a node which lives at a given index and level.
     * @param level Level of the node.
     * @param index Index of the node.
     * @returns The data of the node.
     */
    getNode(level: number, index: bigint): Promise<Field>;
    /**
     * Returns the root of the [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree).
     * @returns The root of the Merkle Tree.
     */
    getRoot(): Promise<Field>;
    setNode(level: number, index: bigint, value: Field): Promise<void>;
    /**
     * Sets the value of a leaf node at a given index to a given value.
     * @param index Position of the leaf node.
     * @param leaf New value.
     */
    setLeaf(index: bigint, leaf: Field): Promise<void>;
    /**
     * Returns the witness (also known as [Merkle Proof or Merkle Witness](https://computersciencewiki.org/index.php/Merkle_proof)) for the leaf at the given index.
     * @param index Position of the leaf node.
     * @returns The witness that belongs to the leaf.
     */
    getWitness(index: bigint): Promise<Witness>;
    /**
     * Checks if the witness that belongs to the leaf at the given index is a valid witness.
     * @param index Position of the leaf node.
     * @returns True if the witness for the leaf node is valid.
     */
    validate(index: bigint): Promise<boolean>;
    /**
     * Fills all leaves of the tree.
     * @param leaves Values to fill the leaves with.
     */
    fill(leaves: Field[]): void;
    /**
     * Returns the amount of leaf nodes.
     * @returns Amount of leaf nodes.
     */
    get leafCount(): bigint;
}
/**
 * The {@link BaseMerkleWitness} class defines a circuit-compatible base class for [Merkle Witness'](https://computersciencewiki.org/index.php/Merkle_proof).
 */
declare class BaseMerkleWitness {
    static height: number;
    path: Field[];
    isLeft: Bool[];
    height: number;
    /**
     * Takes a {@link Witness} and turns it into a circuit-compatible Witness.
     * @param witness Witness.
     * @returns A circuit-compatible Witness.
     */
    constructor(witness: Witness, _height: number);
    /**
     * Calculates a root depending on the leaf value.
     * @param leaf Value of the leaf node that belongs to this Witness.
     * @returns The calculated root.
     */
    calculateRoot(leaf: Field): Field;
}
declare function maybeSwap(b: Bool, x: Field, y: Field): [Field, Field];
