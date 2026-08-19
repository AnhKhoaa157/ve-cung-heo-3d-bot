import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(rootDir, 'data');
const storePath = path.join(dataDir, 'bot-data.json');
const emptyStore = () => ({ nextIds: { task: 1, meeting: 1, reminder: 1, resource: 1 }, tasks: [], meetings: [], reminders: [], resources: [], meta: {} });

let store = emptyStore();
let writeQueue = Promise.resolve();

export async function initializeStore() {
  await mkdir(dataDir, { recursive: true });
  try {
    store = JSON.parse(await readFile(storePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await persist();
  }
  store.nextIds ??= {};
  store.nextIds.task ??= 1;
  store.nextIds.meeting ??= 1;
  store.nextIds.reminder ??= 1;
  store.nextIds.poll ??= 1;
  store.nextIds.resource ??= 1;
  store.tasks ??= [];
  store.meetings ??= [];
  store.reminders ??= [];
  store.polls ??= [];
  store.resources ??= [];
  store.dailyClaims ??= [];
  store.meta ??= {};
  await persist();
}

export function getStore() {
  return store;
}

export async function persist() {
  writeQueue = writeQueue.then(() => writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8'));
  return writeQueue;
}

export async function createRecord(type, value) {
  const id = store.nextIds[type]++;
  const record = { id, ...value };
  store[`${type}s`].push(record);
  await persist();
  return record;
}
