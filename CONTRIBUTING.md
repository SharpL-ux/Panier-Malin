# Contribuer à Panier malin

Merci de votre intérêt ! Vous pouvez aider sans écrire de code :

- **signaler un produit manquant, un prix étrange ou une équivalence fausse** avec les modèles de tickets du dépôt ;
- **ajouter des prix sur [Open Prices](https://prices.openfoodfacts.org)** : c'est la contribution la plus utile, elle profite à cette application comme à toutes les autres ;
- **vérifier des codes-barres** du catalogue sur [Open Food Facts](https://world.openfoodfacts.org).

## Préparer l'environnement

Node.js 22 (20.19 au minimum) et npm suffisent.

```bash
npm ci
npm run dev
```

Avant de proposer une modification, vérifiez que tout passe, comme le fera l'intégration continue :

```bash
npm run lint && npm run format:check && npm run typecheck && npm test
```

## Conventions de commit

Les messages suivent [Conventional Commits](https://www.conventionalcommits.org/fr/), rédigés en français, à l'impératif présent :

```
type(portée): description courte

Corps facultatif : le pourquoi, plus que le comment.
```

| Type          | Usage                                                         |
| ------------- | ------------------------------------------------------------- |
| `feat`        | Nouvelle fonctionnalité                                       |
| `fix`         | Correction d'un défaut                                        |
| `style`       | Présentation et mise en page, sans changement de comportement |
| `refactor`    | Réorganisation du code, sans changement de comportement       |
| `test`        | Ajout ou correction de tests                                  |
| `docs`        | Documentation                                                 |
| `data`        | Catalogue : produits, équivalences, codes-barres              |
| `ci`, `chore` | Intégration continue, outillage, dépendances                  |

Portées courantes : `catalogue`, `liste`, `prix`, `comparateur`, `pdf`, `ui`.

Exemples : `feat(liste): duplique la liste de la semaine précédente`, `data(catalogue): ajoute les codes-barres vérifiés du rayon Crèmerie`.

## Proposer une modification

1. Créez une branche depuis `main` : `feat/historique-listes`, `data/codes-barres-cremerie`…
2. Faites des commits petits et cohérents.
3. Ouvrez une pull request en remplissant la liste de vérifications.
4. Toute règle métier nouvelle ou modifiée (calcul de prix, équivalence, total, panier optimal) doit être couverte par un test.

## Ajouter un produit au catalogue

Le catalogue se trouve dans `src/data/products.json`, un produit par ligne.

1. **Vérifiez que le produit est courant** et vendu dans au moins une des enseignes gérées. Un produit que vous êtes seul à acheter a sa place dans vos produits personnalisés, pas dans le catalogue.
2. **Rattachez-le à un groupe d'équivalence** de `src/data/equivalenceGroups.json`, ou créez-en un (voir plus bas).
3. **Construisez l'identifiant** à partir du groupe, de la marque et du format, en minuscules, sans accents : `beurre-doux-president-250g`.
4. **Renseignez le format** : `{ "count": 6, "size": 1000, "unit": "ml" }` pour un pack de 6 × 1 L. Les unités sont `g`, `ml` ou `piece`.
5. **Pour une marque de distributeur**, indiquez son enseigne dans `enseignes` et mettez `brandType` à `distributeur`. Pour une marque nationale ou du vrac, laissez `enseignes` vide.
6. **Le code-barres (`ean`)** : ne le remplissez que si vous l'avez lu sur l'emballage ou sur une fiche Open Food Facts dont la photo correspond bien au produit, dans ce format. En cas de doute, laissez `""`. Un code faux rattacherait au produit les prix d'un autre.
7. Lancez `npm test` : le test du catalogue signale les doublons, les clés de contrôle fausses et les incohérences de format.

**Ne copiez pas de données depuis les sites des enseignes.** Leurs conditions d'utilisation l'interdisent généralement et leurs bases de données sont protégées. Les emballages, Open Food Facts et Open Prices sont les bonnes sources.

## Créer ou corriger un groupe d'équivalence

Un groupe réunit des produits **interchangeables pour un usage courant**, qu'on accepterait l'un pour l'autre quand on choisit « Peu importe la marque ».

- Oui : tous les laits demi-écrémés UHT, quelle que soit la marque ou la taille du pack.
- Non : un lait bio et un lait conventionnel (deux groupes), des spaghetti et des spaghetti complets, du beurre doux et du beurre demi-sel.
- Tous les produits d'un groupe partagent le même rayon et la même unité de comparaison (`kg`, `L` ou `piece`), déclarés dans le groupe :

```json
{
  "id": "lait-demi-ecreme",
  "label": "Lait demi-écrémé UHT",
  "categoryId": "cremerie",
  "refUnit": "L"
}
```

L'identifiant du groupe ne contient pas de format : la comparaison entre tailles différentes est calculée automatiquement.

## Ajouter une enseigne

1. Ajoutez son identifiant au type `EnseigneId` dans `src/types/catalog.ts`.
2. Déclarez-la dans `src/data/enseignes.ts` : nom, couleurs du badge (contraste d'au moins 4,5:1 entre le texte et le fond), motifs de reconnaissance dans les noms OpenStreetMap.
3. N'utilisez jamais son logo officiel.

## Règles de code

- TypeScript strict ; pas de `any` sans justification en commentaire.
- La logique métier va dans `src/services/`, en fonctions pures testées, indépendantes de React.
- Les montants sont des centimes entiers. Convertissez les prix reçus avec `parseEuroToCents`, jamais avec une multiplication par 100.
- Chaque élément interactif est utilisable au clavier et porte un libellé explicite pour les lecteurs d'écran ; l'information ne repose jamais sur la couleur seule.
- Les textes de l'interface sont en français, courts, à la voix active : un bouton dit ce qu'il fait (« Créer le produit », pas « Valider »).
- Les appels aux API passent par les services existants, qui gèrent les limites de débit et le cache. Pas d'appel en masse : ces services sont gratuits et partagés.
