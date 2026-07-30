import { handleKnowledgeSnapshot } from '../_shared/a8-core.js';

export async function onRequest(context) {
  return handleKnowledgeSnapshot(context);
}

export default onRequest;
