import { handleLogout } from '../_shared/a8-core.js';

export async function onRequest(context) {
  return handleLogout(context);
}

export default onRequest;
