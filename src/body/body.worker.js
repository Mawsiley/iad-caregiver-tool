import { sculptAll } from './sculpt.js';

const meshes = sculptAll();
const transfer = [];
for (const m of Object.values(meshes)) for (const a of Object.values(m)) transfer.push(a.buffer);
self.postMessage(meshes, transfer);
