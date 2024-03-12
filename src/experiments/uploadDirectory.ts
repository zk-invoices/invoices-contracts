import { config } from "dotenv";

import { Storage, StorageType } from "@tweedegolf/storage-abstraction";
import { v4 } from 'uuid';

import { readdir } from 'fs/promises';

config();

const cachePath = process.argv[2];
const bucketId = v4();

const files = await readdir(cachePath);

const directory = files
  .filter((file: string) => {
    return !file.endsWith('.header') && file.indexOf('-pk-') < 0;
  })
  .map((name) => {
    return { name, type: 'string' };
  });

const configuration = {
  type: StorageType.AZURE,
  accountName: process.env.AZURE_ACC_NAME,
  accountKey: process.env.AZURE_ACC_KEY,
  bucketName: process.env.AZURE_CONTAINER_NAME
};

const store = new Storage(configuration);

await store.addFile({
  buffer: Buffer.from(JSON.stringify(directory)),
  targetPath: `${bucketId}/directory.json`
});

await Promise.allSettled(files.map(async (fileName) => {
  const prom = store.addFileFromPath({
    origPath: `${cachePath}/${fileName}`,
    targetPath: `${bucketId}/${fileName}`
  });

  await prom;

  console.log('uploaded', fileName);

  return prom;
}));

console.log(bucketId);
