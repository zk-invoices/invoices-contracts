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
  Reducer,
  Account,
  UInt32,
  State,
  state
} from 'o1js';
import { Invoice, InvoicesWitness } from './InvoicesModels.js';
import { Invoices } from './Invoices.js';

export class InvoicesProvider extends SmartContract {
  @state(Field) tokenZkAppVkHash = State<Field>();

  deploy(args: DeployArgs) {
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

  @method upgradeRoot(vKey: VerificationKey) {
    this.tokenZkAppVkHash.getAndRequireEquals();

    this.tokenZkAppVkHash.set(vKey.hash);
  }

  @method
  mint(address: PublicKey, vk: VerificationKey, initialRoot: Field, initialLimit: Field) {
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
      { isSome: Bool(true), value: Field.from(initialLimit) },
      { isSome: Bool(true), value: Field.from(0) },
      { isSome: Bool(true), value: Field(0) },
      { isSome: Bool(true), value: Field(0) },
      { isSome: Bool(true), value: Field(0) },
    ];
  }

  @method upgrade(address: PublicKey, vk: VerificationKey) {
    const update = AccountUpdate.createSigned(address, this.token.id);
    const zkAppHash = this.tokenZkAppVkHash.getAndRequireEquals();

    vk.hash.assertEquals(zkAppHash, 'Verification key hash does not match');

    update.body.update.verificationKey = { isSome: Bool(true), value: vk };
    const appStateUpdates = new Array(8);

    appStateUpdates[0] = { isSome: Bool(true), value: vk.hash };
  }

  @method createInvoice(address: PublicKey, invoice: Invoice, path: InvoicesWitness) {
    const zkAppTokenAccount = this.getZkAppAccount(address);

    zkAppTokenAccount.createInvoice(invoice, path);
  }

  @method settleInvoice(address: PublicKey, invoice: Invoice, path: InvoicesWitness) {
    const zkAppTokenAccount = this.getZkAppAccount(address);

    zkAppTokenAccount.settleInvoice(invoice, path);
  }

  @method commit(address: PublicKey) {
    const zkAppTokenAccount = this.getZkAppAccount(address);

    zkAppTokenAccount.commit();
  }

  @method increaseLimit(address: PublicKey, amount: UInt32) {
    const zkAppTokenAccount = this.getZkAppAccount(address);
    zkAppTokenAccount.increaseLimit(amount);
  }

  getZkAppAccount(address: PublicKey): Invoices {
    const zkAppTokenAccount = new Invoices(address, this.token.id);
    const zkAppHash = zkAppTokenAccount.vkHash.getAndRequireEquals();
    const providerTokenAppHash = this.tokenZkAppVkHash.getAndRequireEquals();

    zkAppHash.assertEquals(providerTokenAppHash, 'Token app mismatch, update the verification key');

    return zkAppTokenAccount;
  }
}
