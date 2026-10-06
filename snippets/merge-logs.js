// The app is local-first: check-ins are saved on the phone immediately and
// mirrored to Firestore when she's signed in. On sign-in (new phone, or
// after using the app offline) the two sides are merged: logs are unioned
// by id, the cloud copy wins a conflict, and anything that only existed on
// this phone is pushed up. For one user on one or two devices this simple
// last-write-wins rule is enough; it is not meant to be a sync engine.

function mergeLogs(local, cloud) {
  const byId = new Map(local.map((l) => [l.id, l]));
  for (const log of cloud) byId.set(log.id, log);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Local logs the cloud doesn't have yet (to push after the merge). */
function localOnly(local, cloud) {
  const cloudIds = new Set(cloud.map((l) => l.id));
  return local.filter((l) => !cloudIds.has(l.id));
}

module.exports = { mergeLogs, localOnly };
