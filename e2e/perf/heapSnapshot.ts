import type { CDPSession } from '@playwright/test';

/** Native object types whose counts reveal leaked matches even in a minified build (class names are kept). */
export const WATCHED_NATIVE_OBJECTS = [
  'HTMLCanvasElement',
  'Detached HTMLCanvasElement',
  'WebGL2RenderingContext',
  'WebGLRenderingContext',
  'ResizeObserver',
  'AudioBufferSourceNode',
  'GainNode',
] as const;

interface SnapshotMeta {
  readonly node_fields: readonly string[];
  readonly node_types: readonly [readonly string[], ...unknown[]];
}

/** Only real objects count (not strings, hidden classes or code that merely carry the same name). */
const COUNTED_NODE_TYPES = new Set(['object', 'native']);

interface HeapSnapshotJson {
  readonly snapshot: { readonly meta: SnapshotMeta; readonly node_count: number };
  readonly nodes: readonly number[];
  readonly strings: readonly string[];
}

/** Takes a heap snapshot through CDP and counts the objects with the given names. */
export async function countHeapObjects(
  cdp: CDPSession,
  names: readonly string[] = WATCHED_NATIVE_OBJECTS,
): Promise<Record<string, number>> {
  const chunks: string[] = [];
  const onChunk = ({ chunk }: { chunk: string }) => chunks.push(chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
  const snapshot = JSON.parse(chunks.join('')) as HeapSnapshotJson;
  const fields = snapshot.snapshot.meta.node_fields;
  const nameOffset = fields.indexOf('name');
  const typeOffset = fields.indexOf('type');
  const nodeTypes = snapshot.snapshot.meta.node_types[0];
  const fieldCount = fields.length;
  const wanted = new Set(names);
  const counts: Record<string, number> = Object.fromEntries(names.map((name) => [name, 0]));
  for (let index = 0; index < snapshot.nodes.length; index += fieldCount) {
    const nodeType = nodeTypes[snapshot.nodes[index + typeOffset] ?? -1];
    if (nodeType === undefined || !COUNTED_NODE_TYPES.has(nodeType)) continue;
    const name = snapshot.strings[snapshot.nodes[index + nameOffset] ?? -1];
    if (name !== undefined && wanted.has(name)) counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}
