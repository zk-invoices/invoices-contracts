import { Bool, Field, Poseidon } from "o1js";

// external API
export { Witness, PersistentMerkleTree, BaseMerkleWitness };

// internal API
export { maybeSwap };

type Witness = { isLeft: boolean; sibling: Field }[];

class Store {
  private nodes: Record<number, Record<string, Field>> = {};

  /**
   * Returns a node which lives at a given index and level.
   * @param level Level of the node.
   * @param index Index of the node.
   * @returns The data of the node.
   */
  async getNode(level: number, index: bigint, _default: Field): Promise<Field> {
    return this.nodes[level]?.[index.toString()] ?? _default;
  }

  // TODO: this allows to set a node at an index larger than the size. OK?
  async setNode(level: number, index: bigint, value: Field) {
    return (this.nodes[level] ??= {})[index.toString()] = value;
  }
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
class PersistentMerkleTree {
  // private nodes: Record<number, Record<string, Field>> = {};
  private store: Store;
  private zeroes: Field[];

  /**
   * Creates a new, empty [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree).
   * @param height The height of Merkle Tree.
   * @returns A new MerkleTree
   */
  constructor(public readonly height: number, _store: Store) {
    this.zeroes = new Array(height);
    this.store = _store;
    this.zeroes[0] = Field(0);
    for (let i = 1; i < height; i += 1) {
      this.zeroes[i] = Poseidon.hash([this.zeroes[i - 1], this.zeroes[i - 1]]);
    }
  }

  /**
   * Returns a node which lives at a given index and level.
   * @param level Level of the node.
   * @param index Index of the node.
   * @returns The data of the node.
   */
  async getNode(level: number, index: bigint): Promise<Field> {
    return this.store.getNode(level, index, this.zeroes[level]);
  }

  /**
   * Returns the root of the [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree).
   * @returns The root of the Merkle Tree.
   */
  async getRoot(): Promise<Field> {
    return this.getNode(this.height - 1, 0n);
  }

  // TODO: this allows to set a node at an index larger than the size. OK?
  async setNode(level: number, index: bigint, value: Field) {
    return this.store.setNode(level, index, value);
  }

  // TODO: if this is passed an index bigger than the max, it will set a couple of out-of-bounds nodes but not affect the real Merkle root. OK?
  /**
   * Sets the value of a leaf node at a given index to a given value.
   * @param index Position of the leaf node.
   * @param leaf New value.
   */
  async setLeaf(index: bigint, leaf: Field) {
    if (index >= this.leafCount) {
      throw new Error(
        `index ${index} is out of range for ${this.leafCount} leaves.`
      );
    }
    this.setNode(0, index, leaf);
    let currIndex = index;
    for (let level = 1; level < this.height; level++) {
      currIndex /= 2n;

      const left = await this.getNode(level - 1, currIndex * 2n);
      const right = await this.getNode(level - 1, currIndex * 2n + 1n);

      this.setNode(level, currIndex, Poseidon.hash([left, right]));
    }
  }

  /**
   * Returns the witness (also known as [Merkle Proof or Merkle Witness](https://computersciencewiki.org/index.php/Merkle_proof)) for the leaf at the given index.
   * @param index Position of the leaf node.
   * @returns The witness that belongs to the leaf.
   */
  async getWitness(index: bigint): Promise<Witness> {
    if (index >= this.leafCount) {
      throw new Error(
        `index ${index} is out of range for ${this.leafCount} leaves.`
      );
    }
    const witness = [];
    for (let level = 0; level < this.height - 1; level++) {
      const isLeft = index % 2n === 0n;
      const sibling = await this.getNode(level, isLeft ? index + 1n : index - 1n);
      witness.push({ isLeft, sibling });
      index /= 2n;
    }

    return witness;
  }

  // TODO: this will always return true if the merkle tree was constructed normally; seems to be only useful for testing. remove?
  /**
   * Checks if the witness that belongs to the leaf at the given index is a valid witness.
   * @param index Position of the leaf node.
   * @returns True if the witness for the leaf node is valid.
   */
  async validate(index: bigint): Promise<boolean> {
    const path = await this.getWitness(index);
    let hash = await this.getNode(0, index);
    for (const node of path) {
      hash = Poseidon.hash(
        node.isLeft ? [hash, node.sibling] : [node.sibling, hash]
      );
    }

    return hash.toString() === this.getRoot().toString();
  }

  // TODO: should this take an optional offset? should it fail if the array is too long?
  /**
   * Fills all leaves of the tree.
   * @param leaves Values to fill the leaves with.
   */
  fill(leaves: Field[]) {
    leaves.forEach((value, index) => {
      this.setLeaf(BigInt(index), value);
    });
  }

  /**
   * Returns the amount of leaf nodes.
   * @returns Amount of leaf nodes.
   */
  get leafCount(): bigint {
    return 2n ** BigInt(this.height - 1);
  }
}

/**
 * The {@link BaseMerkleWitness} class defines a circuit-compatible base class for [Merkle Witness'](https://computersciencewiki.org/index.php/Merkle_proof).
 */
class BaseMerkleWitness {
  static height: number;
  path: Field[];
  isLeft: Bool[];
  height: number;

  /**
   * Takes a {@link Witness} and turns it into a circuit-compatible Witness.
   * @param witness Witness.
   * @returns A circuit-compatible Witness.
   */
  constructor(witness: Witness, _height: number) {
    let height = witness.length + 1;
    if (height !== _height) {
      throw Error(
        `Length of witness ${height}-1 doesn't match static tree height ${_height}.`
      );
    }
    this.height = _height;
    this.path = witness.map((item) => item.sibling);
    this.isLeft = witness.map((item) => Bool(item.isLeft));
  }

  /**
   * Calculates a root depending on the leaf value.
   * @param leaf Value of the leaf node that belongs to this Witness.
   * @returns The calculated root.
   */
  calculateRoot(leaf: Field): Field {
    let hash = leaf;
    let n = this.height;

    for (let i = 1; i < n; ++i) {
      let isLeft = this.isLeft[i - 1];
      const [left, right] = maybeSwap(isLeft, hash, this.path[i - 1]);
      hash = Poseidon.hash([left, right]);
    }

    return hash;
  }
}

// more efficient version of `maybeSwapBad` which reuses an intermediate variable
function maybeSwap(b: Bool, x: Field, y: Field): [Field, Field] {
  let m = b.toField().mul(x.sub(y)); // b*(x - y)
  const x_ = y.add(m); // y + b*(x - y)
  const y_ = x.sub(m); // x - b*(x - y) = x + b*(y - x)
  return [x_, y_];
}

async function run () {
  const store = new Store();
  const tree = new PersistentMerkleTree(32, store);

  tree.setLeaf(0n, Field(0));

  console.log(new BaseMerkleWitness(await tree.getWitness(0n), 32));
  tree.getRoot();
}

run();