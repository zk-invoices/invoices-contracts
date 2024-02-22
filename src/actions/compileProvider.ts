import { Cache } from 'o1js';
import { InvoicesProvider } from '../index.js';

const providerCache: Cache = Cache.FileSystem("../cache/providercache");

console.log('Compiling provider');
console.time();
await InvoicesProvider.compile({ cache: providerCache });
console.timeEnd();
