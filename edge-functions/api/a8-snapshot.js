import { handleSnapshot } from '../_shared/a8-core.js';

export async function onRequest(context) {
  return handleSnapshot(context);
}

export default onRequest;
