# 🏆 Coupe du Monde 2026 — Bracket radial interactif

Tableau final de la Coupe du Monde 2026 en bracket radial (trophée au centre),
mis à jour automatiquement avec les résultats réels via l'API publique worldcup26.ir (sans clé).
Un clic sur une équipe ouvre le détail de ses matchs : score, buteurs, cartons, remplacements.

Design inspiré du poster d'Emilio Sansolini · Données API-Football · Fait avec Claude Code.

## Démarrage rapide

```bash
npm install
cp .env.local.example .env.local   # aucune clé requise
npm run dev                        # http://localhost:3000
```

### Mode mock (recommandé pendant le développement)

`USE_MOCK=1` dans `.env.local` : le site lit `data/mock-games.json` au lieu d'appeler worldcup26.ir (utile hors-ligne).
Les données mock couvrent tous les états : matchs terminés (dont t.a.b.),
un match live (63′), des matchs à venir, et des slots encore inconnus (points gris).
Supprimer la variable (ou `USE_MOCK=0`) pour basculer sur l'API réelle.

## Architecture

- **Squelette statique** : `data/bracket-skeleton.json` — positions angulaires
  des 31 matchs (16es → finale), jamais demandé à l'API.
- **Overlay vivant** : `/api/fixtures` (proxy serveur) → mapping DÉTERMINISTE
  par id de match : 73-88 = 16es, 89-96 = 8es, 97-100 = quarts,
  101-102 = demies, 103 = petite finale (hors bracket), 104 = finale.
- **Parseur buteurs** : `lib/parse.ts`, testé (`npm run test:parse`) — guillemets
  courbes/droits, "null" littéral, (p)/(P)/(OG), temps additionnel 45+5.
- **Cache** : `Cache-Control: s-maxage` + stale-while-revalidate → le Edge Cache
  Vercel absorbe le trafic. TTL : terminé 6 h · live 60 s · à venir 1 h.
- **Polling client** : 90 s, uniquement si un match est live.

## Drapeaux

SVG circulaires **circle-flags** (HatScripts, MIT) hébergés en local dans
`public/flags/` — aucune dépendance externe. Mapping manuel nom → ISO dans
`lib/flags.ts` (85 pays couverts, plus large que les 48 qualifiés).
`npm run test:flags` vérifie que chaque équipe des données a son drapeau ;
une équipe non mappée affiche ses initiales + un warning console en dev.

## Points à vérifier avant mise en ligne

1. **Lien Emilio Sansolini** : l'URL Instagram dans `app/page.tsx` (footer) est
   à vérifier/corriger (`TODO` dans le code).
2. **Image OG** : `public/og.png` est un placeholder généré — remplacer idéalement
   par un vrai screenshot du bracket (1200×630).
3. **Mapping des slots** : au premier tour réel, vérifier que l'ordre
   chronologique des 16es correspond bien aux positions voulues sur le cercle ;
   ajuster l'ordre des `angle` dans `bracket-skeleton.json` si besoin pour
   respecter les moitiés de tableau FIFA.
4. **IDs d'équipes mock** : certains ids API-Football du mock sont approximatifs
   (seul l'affichage des logos en mode mock en dépend).
5. **Plan Pro API-Football** avant le pic de trafic (post LinkedIn).

## Déploiement Vercel

Repo GitHub → Vercel « Add New Project » → variable d'env `APIFOOTBALL_KEY`
(Production + Preview) → Deploy. Ne pas définir `USE_MOCK` en production.

## Après la finale (19 juillet)

Les TTL font le travail : tous les matchs étant `FT`, le cache passe à 6 h.
Pour une archive quasi statique, monter `TTL.FINISHED` à 24 h dans
`lib/apifootball.ts` et redescendre au plan Free.
