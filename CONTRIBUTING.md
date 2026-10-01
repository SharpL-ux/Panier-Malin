# Contribuer à Panier malin

Merci de votre intérêt ! Vous pouvez aider sans écrire de code :

- **signaler un produit manquant, un prix étrange ou une référence fausse** avec les modèles de tickets du dépôt ;
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
| `data`        | Catalogue : fiches, références, codes-barres                  |
| `ci`, `chore` | Intégration continue, outillage, dépendances                  |

Portées courantes : `catalogue`, `liste`, `prix`, `comparateur`, `pdf`, `ui`.

Exemples : `feat(liste): duplique la liste de la semaine précédente`, `data(catalogue): ajoute les codes-barres vérifiés du rayon Crèmerie`.

## Proposer une modification

1. Créez une branche depuis `main` : `feat/historique-listes`, `data/codes-barres-cremerie`…
2. Faites des commits petits et cohérents.
3. Ouvrez une pull request en remplissant la liste de vérifications.
4. Toute règle métier nouvelle ou modifiée (calcul de prix, choix des références, total, panier optimal) doit être couverte par un test.

## Ajouter un produit au catalogue

Le catalogue se trouve dans `src/data/products.json`, une fiche par ligne. Une fiche décrit un produit sans marque (« Lait demi-écrémé UHT, 1 L ») ; ses références indiquent quoi prendre dans chaque enseigne.

1. **Vérifiez que le produit est courant** et respecte les règles halal ci-dessous. Un produit que vous êtes seul à acheter a sa place dans vos produits personnalisés, pas dans le catalogue.
2. **Vérifiez qu'il n'a pas déjà sa fiche** : une fiche par produit et par usage. Le lait entier et le lait demi-écrémé ont deux fiches ; deux marques du même lait n'en ont qu'une.
3. **Construisez l'identifiant** à partir du nom, en minuscules, sans accents : `beurre-doux`.
4. **Renseignez le format courant** : `{ "count": 1, "size": 250, "unit": "g" }`. Les unités sont `g`, `ml` ou `piece` ; pour le vrac, `soldByWeight: true` et 1 kg.
5. **Ajoutez les références** que vous connaissez (voir la section suivante).
6. Lancez `npm test` : le test du catalogue signale les doublons, les clés de contrôle fausses, les formats incohérents et les produits non halal.

**Ne copiez pas de données depuis les sites des enseignes.** Leurs conditions d'utilisation l'interdisent généralement et leurs bases de données sont protégées. Les emballages, Open Food Facts et Open Prices sont les bonnes sources.

## Choisir la référence d'une enseigne

Chaque fiche a **au plus une référence par enseigne : sa gamme la moins chère** pour ce produit, en général le premier prix (Simpl chez Carrefour, Eco+ chez E.Leclerc) ou la marque de l'enseigne (Carrefour Classic', Marque Repère, les marques Lidl).

```json
{ "enseigne": "lidl", "brand": "Milbona", "ean": "" }
```

- `brand` : la marque telle qu'elle est imprimée sur l'emballage.
- `ean` : ne le remplissez que si vous l'avez lu sur l'emballage ou sur une fiche Open Food Facts dont la photo correspond bien au produit, dans ce format. En cas de doute, laissez `""` : un code faux rattacherait à la fiche les prix d'un autre produit.
- `pack` : seulement si le format diffère de celui de la fiche (des couches par 48 au lieu de 44), pour que le prix soit ramené à l'unité.
- Si un relevé de prix montre qu'une autre gamme de l'enseigne est moins chère, remplacez la référence plutôt que d'en ajouter une seconde.

## Règles halal

Le catalogue partagé est halal. Une fiche est refusée par les tests si son nom évoque :

- le porc et ses dérivés (lardons, rillettes, chipolatas, gélatine) ;
- une boisson alcoolisée (bière, vin, cidre, spiritueux) ;
- une viande ou une volaille non certifiée halal : toute fiche des rayons Boucherie et Volaille, et toute fiche qui contient de la viande, doit avoir `"halal": true`.

Le jambon et le saucisson ne sont acceptés que certifiés halal (jambon de dinde halal, par exemple). Les fromages, poissons et fruits de mer sont acceptés. Pour les cas que le nom ne permet pas de trancher (arômes, additifs, alcool de cuisson), vérifiez la liste d'ingrédients et les labels sur Open Food Facts avant de proposer la fiche.

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

## Proposer des codes-barres avec le script

Pour compléter les codes-barres des références sans les chercher un par un :

1. `npm run eans:proposer` (accès Internet requis) écrit `scripts/out/propositions-eans.csv`, avec jusqu'à trois candidats par référence trouvés sur Open Prices. Pour un premier essai : `npm run eans:proposer -- --rayon cremerie --limite 20`.
2. Relisez chaque ligne : ouvrez le lien Open Food Facts, vérifiez la marque, la photo et le format, puis écrivez « oui » dans la colonne `valider` des candidats exacts. Dans le doute, laissez vide.
3. `npm run eans:appliquer -- scripts/out/propositions-eans.csv` ajoute les codes validés et vérifie le catalogue ; rien n'est écrit en cas d'erreur.
4. Lancez `npm test`, puis proposez la modification de `src/data/products.json` en précisant, pour chaque code, d'où vient la vérification.

Ne validez jamais un code-barres que vous n'avez pas vérifié : un mauvais code fait apparaître les prix d'un autre produit.
