/**
 * User IDs with whom the current user has an ACCEPTED buddy request (either direction).
 * @param {Array<{ status: string, receiverId?: string }> | undefined} outgoing
 * @param {Array<{ status: string, requesterId?: string }> | undefined} incoming
 */
export function buildAcceptedBuddyIdSet(outgoing, incoming) {
  const ids = new Set();
  for (const r of outgoing ?? []) {
    if (r.status === "ACCEPTED" && r.receiverId) ids.add(r.receiverId);
  }
  for (const r of incoming ?? []) {
    if (r.status === "ACCEPTED" && r.requesterId) ids.add(r.requesterId);
  }
  return ids;
}
