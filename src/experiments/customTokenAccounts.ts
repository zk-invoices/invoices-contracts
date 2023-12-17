import {
  Field,
  AccountUpdate,
  Bool,
  SmartContract,
  DeployArgs,
  PublicKey,
  VerificationKey,
  Permissions,
  method,
  state,
  State,
  Cache,
  Mina,
  PrivateKey
} from 'o1js';

const doProofs = true;

export class Token extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      setDelegate: Permissions.proof(),
      incrementNonce: Permissions.proof(),
      setVotingFor: Permissions.proof(),
      setTiming: Permissions.proof(),
    });
  }

  @method
  mint(address: PublicKey, vk: VerificationKey) {
    this.token.mint({ address, amount: 1 });
    const update = AccountUpdate.createSigned(address, this.token.id);
    update.body.update.verificationKey = { isSome: Bool(true), value: vk };
    update.body.update.permissions = {
      isSome: Bool(true),
      value: {
        ...Permissions.default(),
        setDelegate: Permissions.proof(),
        incrementNonce: Permissions.proof(),
        setVotingFor: Permissions.proof(),
        setTiming: Permissions.proof(),
      },
    };
  }

  @method update(value: Field, address: PublicKey) {
    const zkAppTokenAccount = new TokenAccount(address, this.token.id);
    zkAppTokenAccount.update(value);
  }
}

export class TokenAccount extends SmartContract {
  @state(Field) value = State<Field>();

  @method update(value: Field) {
    const oldValue = this.value.getAndAssertEquals();
    oldValue.assertEquals(value.sub(Field(1)));
    this.value.set(value);
  }
}

async function run() {
  let Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
  Mina.setActiveInstance(Local);
  let initialBalance = 10_000_000_000;

  let feePayerKey = Local.testAccounts[0].privateKey;
  let feePayer = Local.testAccounts[0].publicKey;

  const userPrivateKey = PrivateKey.random();
  const userPublicKey = userPrivateKey.toPublicKey();

  // the zkapp account
  let zkappKey = PrivateKey.random();
  let zkappAddress = zkappKey.toPublicKey();

  // now that we got our accounts set up, we need the commitment to deploy our contract!
  
  let tokensApp = new Token(zkappAddress);
  console.log('Deploying nested tokens');
  console.time();
  const cache: Cache = Cache.FileSystem("./localcache");
  
  const { verificationKey } = (await TokenAccount.compile());

  await Token.compile({ cache });
  console.timeEnd();
  console.log('compiled');
  let tx = await Mina.transaction(feePayer, () => {
    AccountUpdate.fundNewAccount(feePayer).send({
      to: zkappAddress,
      amount: initialBalance
    });
    tokensApp.deploy({});
    tokensApp.account.tokenSymbol.set('bills');
  });
  await tx.prove();
  await tx.sign([feePayerKey, zkappKey]).send();

  await mintToken();
  await update();

  async function mintToken() {
    console.log(`minting for`, userPublicKey.toBase58());
    let tx = await Mina.transaction(feePayer, () => {
      AccountUpdate.fundNewAccount(feePayer).send({
        to: userPublicKey,
        amount: initialBalance
      });
      AccountUpdate.fundNewAccount(feePayer);
      tokensApp.mint(userPrivateKey.toPublicKey(), verificationKey);
    });
    await tx.prove();
    await tx.sign([feePayerKey, userPrivateKey]).send();
  }

  async function update() {
    console.log('updating');
    let tx = await Mina.transaction(feePayer, () => {
      tokensApp.update(Field(1), userPublicKey);
    });
    await tx.prove();
    await tx.sign([feePayerKey, userPrivateKey]).send();
  }
}

run();