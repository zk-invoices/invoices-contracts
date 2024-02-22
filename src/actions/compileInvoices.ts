import { Cache } from 'o1js';
import { Invoices } from '../index.js';

const invoicesCache: Cache = Cache.FileSystem("../cache/invoicescache");

console.log('Compiling Invoices');
console.time();
await Invoices.compile({ cache: invoicesCache });
console.timeEnd();
