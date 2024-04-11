import {
  method,
  Mina,
  AccountUpdate,
  PrivateKey,
  SmartContract,
  PublicKey,
  TokenId,
  TokenContract,
  AccountUpdateForest,
} from 'o1js';

class Token extends TokenContract {
  @method
  approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  @method mint(receiverAddress: PublicKey) {
    let amount = 1_000_000;
    this.token.mint({ address: receiverAddress, amount });
  }

  @method burn(receiverAddress: PublicKey) {
    let amount = 1_000;
    this.token.burn({ address: receiverAddress, amount });
  }
}

class ZkAppB extends SmartContract {
  @method approveSend() {
    this.balance.subInPlace(1_000);
  }
}

class ZkAppC extends SmartContract {
  @method approveSend() {
    this.balance.subInPlace(1_000);
  }
}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let [
  { publicKey: sender, privateKey: senderKey },
  { publicKey: tokenAccount1 },
] = Local.testAccounts;
let initialBalance = 10_000_000;

let tokenZkAppKey = PrivateKey.random();
let tokenZkAppAddress = tokenZkAppKey.toPublicKey();

let zkAppCKey = PrivateKey.random();
let zkAppCAddress = zkAppCKey.toPublicKey();

let zkAppBKey = PrivateKey.random();
let zkAppBAddress = zkAppBKey.toPublicKey();

let tokenZkApp = new Token(tokenZkAppAddress);
let tokenId = tokenZkApp.token.id;

let zkAppB = new ZkAppB(zkAppBAddress, tokenId);
let zkAppC = new ZkAppC(zkAppCAddress, tokenId);
let tx;

console.log('tokenZkAppAddress', tokenZkAppAddress.toBase58());
console.log('zkAppB', zkAppBAddress.toBase58());
console.log('zkAppC', zkAppCAddress.toBase58());
console.log('receiverAddress', tokenAccount1.toBase58());
console.log('feePayer', sender.toBase58());
console.log('-------------------------------------------');

console.log('compile (TokenContract)');
await Token.compile();
console.log('compile (ZkAppB)');
await ZkAppB.compile();
console.log('compile (ZkAppC)');
await ZkAppC.compile();

console.log('deploy tokenZkApp');
tx = await Mina.transaction(sender, () => {
  tokenZkApp.deploy();
  AccountUpdate.fundNewAccount(sender).send({
    to: tokenZkApp.self,
    amount: initialBalance,
  });
});
await tx.sign([senderKey, tokenZkAppKey]).send();

console.log('deploy zkAppB and zkAppC');
tx = await Mina.transaction(sender, () => {
  AccountUpdate.fundNewAccount(sender, 2);
  zkAppC.deploy();
  zkAppB.deploy();
  tokenZkApp.approveAccountUpdates([zkAppC.self, zkAppB.self]);
});
console.log('deploy zkAppB and zkAppC (proof)');
await tx.prove();
await tx.sign([senderKey, zkAppBKey, zkAppCKey]).send();

console.log('mint token to zkAppB');
tx = await Mina.transaction(sender, () => {
  tokenZkApp.mint(zkAppBAddress);
});
await tx.prove();
await tx.sign([senderKey]).send();

console.log('approve send from zkAppB');
tx = await Mina.transaction(sender, () => {
  zkAppB.approveSend();

  // we call the token contract with the self update
  tokenZkApp.transfer(zkAppB.self, zkAppCAddress, 1_000);
});
console.log('approve send (proof)');
await tx.prove();
await tx.sign([senderKey]).send();

console.log(
  `zkAppC's balance for tokenId: ${TokenId.toBase58(tokenId)}`,
  Mina.getBalance(zkAppCAddress, tokenId).value.toBigInt()
);

console.log('approve send from zkAppC');
tx = await Mina.transaction(sender, () => {
  // Pay for tokenAccount1's account creation
  AccountUpdate.fundNewAccount(sender);
  zkAppC.approveSend();

  // we call the token contract with the tree
  tokenZkApp.transfer(zkAppC.self, tokenAccount1, 1_000);
});
console.log('approve send (proof)');
await tx.prove();
await tx.sign([senderKey]).send();

console.log(
  `tokenAccount1's balance for tokenId: ${TokenId.toBase58(tokenId)}`,
  Mina.getBalance(tokenAccount1, tokenId).value.toBigInt()
);