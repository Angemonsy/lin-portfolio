import { handleMe } from '../_shared/a8-core.js';

export async function onRequest(context) {
  return handleMe(context);
}

export default onRequest;
