/**
 * BODACC Watcher - GitHub Action quotidienne
 * Vérifie les nouvelles annonces BODACC pour les SIREN surveillés
 * Stocke dans Firebase RTDB (afr-nt2) et envoie FCM si nouveautés
 *
 * Variables d'env requises :
 *   FIREBASE_DB_URL    : https://afr-nt2-default-rtdb.europe-west1.firebasedatabase.app
 *   FIREBASE_DB_SECRET : Database secret (Firebase console > Service accounts > Database secrets)
 *   FCM_SERVER_KEY     : Clé serveur FCM (optionnel, pour notifications)
 *   FCM_TOPIC          : Topic FCM à notifier (optionnel, ex: "bodacc-alerts")
 */

const DB_URL = process.env.FIREBASE_DB_URL;
const DB_SECRET = process.env.FIREBASE_DB_SECRET;
const FCM_KEY = process.env.FCM_SERVER_KEY;
const FCM_TOPIC = process.env.FCM_TOPIC || "bodacc-alerts";

const BODACC_API = "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records";

if (!DB_URL || !DB_SECRET) {
  console.error("❌ FIREBASE_DB_URL ou FIREBASE_DB_SECRET manquant");
  process.exit(1);
}

const sanitizeKey = (s) => String(s).replace(/[.#$/\[\]]/g, "_");

async function dbGet(path) {
  const r = await fetch(`${DB_URL}/${path}.json?auth=${DB_SECRET}`);
  if (!r.ok) throw new Error(`DB GET ${path}: HTTP ${r.status}`);
  return r.json();
}

async function dbSet(path, data) {
  const r = await fetch(`${DB_URL}/${path}.json?auth=${DB_SECRET}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error(`DB SET ${path}: HTTP ${r.status}`);
  return r.json();
}

async function fetchBodacc(siren) {
  const url = `${BODACC_API}?where=registre%3D%22${siren}%22&order_by=dateparution%20desc&limit=20`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`BODACC ${siren}: HTTP ${r.status}`);
  const data = await r.json();
  return data.results || [];
}

async function sendFCM(newAnnonces) {
  if (!FCM_KEY || !newAnnonces.length) return;
  const titles = newAnnonces.slice(0, 3).map(a => `${a._label}: ${a.familleavis_lib || a.familleavis || "annonce"}`).join(" · ");
  const body = newAnnonces.length > 3
    ? `${titles} (+${newAnnonces.length - 3} autres)`
    : titles;

  const payload = {
    to: `/topics/${FCM_TOPIC}`,
    notification: {
      title: `🚨 BODACC : ${newAnnonces.length} nouvelle(s) annonce(s)`,
      body: body,
      icon: "https://blp-47.github.io/AFR/icon.png"
    },
    data: {
      type: "bodacc_alert",
      count: String(newAnnonces.length),
      sirens: newAnnonces.map(a => a._siren).join(",")
    }
  };

  const r = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `key=${FCM_KEY}`
    },
    body: JSON.stringify(payload)
  });
  console.log("FCM:", r.status, await r.text());
}

async function main() {
  console.log("🔍 BODACC Watch démarré");
  const watchlist = await dbGet("bodacc/watchlist") || {};
  const sirens = Object.keys(watchlist);

  if (!sirens.length) {
    console.log("⚠️ Aucun SIREN dans la watchlist");
    return;
  }

  console.log(`📋 ${sirens.length} SIREN à vérifier : ${sirens.join(", ")}`);

  const newAnnonces = [];

  for (const siren of sirens) {
    const label = watchlist[siren]?.label || siren;
    try {
      const results = await fetchBodacc(siren);
      console.log(`  ${siren} (${label}) : ${results.length} annonce(s) BODACC`);

      for (const item of results) {
        const id = item.id || `${item.numeroannonce}_${item.dateparution}`;
        const key = sanitizeKey(id);
        const existing = await dbGet(`bodacc/annonces/${siren}/${key}`);

        if (!existing) {
          const enriched = {
            ...item,
            _siren: siren,
            _label: label,
            _seenAt: Date.now(),
            _isNew: true
          };
          await dbSet(`bodacc/annonces/${siren}/${key}`, enriched);
          newAnnonces.push(enriched);
          console.log(`    ✨ NOUVEAU : ${item.familleavis_lib || item.familleavis} (${item.dateparution})`);
        }
      }
    } catch (e) {
      console.error(`  ❌ ${siren} :`, e.message);
    }
  }

  // Log d'exécution
  await dbSet("bodacc/lastRun", {
    timestamp: Date.now(),
    sirensChecked: sirens.length,
    newAnnoncesCount: newAnnonces.length,
    iso: new Date().toISOString()
  });

  console.log(`\n✅ Terminé. ${newAnnonces.length} nouvelle(s) annonce(s) au total.`);

  if (newAnnonces.length) {
    await sendFCM(newAnnonces);
  }
}

main().catch(e => {
  console.error("💥 Erreur fatale :", e);
  process.exit(1);
});
