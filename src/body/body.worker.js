import { sculptAll } from './sculpt.js';

const result = sculptAll();
const transfer = [];
for (const m of Object.values(result.meshes)) for (const a of Object.values(m)) transfer.push(a.buffer);
self.postMessage(result, transfer);
