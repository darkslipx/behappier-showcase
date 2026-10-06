// O app grava primeiro no celular: o check-in é salvo na hora e espelhado
// no Firestore quando ela está logada. No login (celular novo, ou depois de
// usar o app offline) os dois lados são juntados: os registros são unidos
// pelo id, a cópia da nuvem ganha em caso de conflito, e o que só existia
// neste celular sobe. Para uma usuária em um ou dois aparelhos essa regra
// simples basta; não é pra ser um motor de sincronização.

function mergeLogs(local, cloud) {
  const byId = new Map(local.map((l) => [l.id, l]));
  for (const log of cloud) byId.set(log.id, log);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Registros do celular que a nuvem ainda não tem (pra subir depois de juntar). */
function localOnly(local, cloud) {
  const cloudIds = new Set(cloud.map((l) => l.id));
  return local.filter((l) => !cloudIds.has(l.id));
}

module.exports = { mergeLogs, localOnly };
