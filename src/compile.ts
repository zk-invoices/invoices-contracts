import { Cache } from 'o1js';
import { InvoicesProvider, Invoices } from './index.js';

const invoicesCache: Cache = Cache.FileSystem("../cache/invoicescache");
const providerCache: Cache = Cache.FileSystem("../cache/providercache");


console.log('Compiling provider');
console.time();
await InvoicesProvider.compile({ cache: providerCache });
console.timeEnd();

console.log('Compiling Invoices');
console.time();
await Invoices.compile({ cache: invoicesCache });
console.timeEnd();
