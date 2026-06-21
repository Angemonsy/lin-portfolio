import { handleLogin } from '../_shared/a8-core.js';

export async function onRequest(context) {
  return handleLogin(context);
}

export default onRequest;
