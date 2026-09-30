# Panier malin

Liste de courses de la semaine et comparateur de prix entre magasins, alimenté par les relevés collaboratifs d'[Open Prices](https://prices.openfoodfacts.org), le projet de prix d'Open Food Facts.

Application web libre, sans compte ni serveur : tout reste dans votre navigateur.

> **État du projet : étape 1 sur 6 terminée (catalogue).** Les prix Open Prices, le comparateur, le panier optimal et l'export PDF arrivent dans les étapes suivantes, décrites dans la [feuille de route](#feuille-de-route).

<p>
  <img src="docs/captures/catalogue-mobile.png" width="260" alt="Catalogue sur mobile : rayon Volaille, fiches certifiées halal, magasin Carrefour choisi">
  <img src="docs/captures/liste-mode-sombre.png" width="260" alt="Liste de la semaine en mode sombre, classée par rayon">
</p>
<img src="docs/captures/catalogue-ordinateur.png" width="800" alt="Catalogue sur ordinateur : rayon Crèmerie, chaque fiche indique la marque à prendre chez Lidl">

## Ce que fait l'application aujourd'hui

- **Catalogue halal de 195 produits courants**, rangés dans 22 rayons présentés dans l'ordre de passage en magasin. Ni porc, ni alcool, ni gélatine de porc ; la viande et la volaille sont certifiées halal.
- **Une fiche par produit** : vous ajoutez « Bananes » ou « Lait demi-écrémé UHT, 1 L », sans choisir de marque. Derrière chaque fiche, l'application connaît la gamme la moins chère de chaque enseigne (premier prix ou marque de l'enseigne), que le comparateur utilisera.
- **Recherche instantanée**, insensible aux accents et aux majuscules, par nom de produit ou par marque.
- **« Mon magasin »**, en haut de l'écran : chaque fiche indique alors quoi prendre en rayon dans cette enseigne (« Chez Lidl : Milbona »).
- **Produits personnalisés** : pour un produit précis, saisissez son code-barres ; l'application récupère le nom, la marque, la photo et le format sur Open Food Facts.
- **Liste de la semaine** classée par rayon, avec quantités à la pièce ou au poids.
- Mode sombre, affichage adapté au téléphone, navigation complète au clavier et au lecteur d'écran.

## Feuille de route

| Étape | Contenu                                                                                                                     | État     |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1     | Catalogue, recherche, filtres, produits personnalisés                                                                       | Terminée |
| 2     | Liste complète : nom modifiable, notes, cases à cocher, historique des semaines, duplication, favoris, bandeau du total     | À faire  |
| 3     | Prix Open Prices : service groupé, cache de 24 h, saisie manuelle, choix des magasins proches, propositions de codes-barres | À faire  |
| 4     | Comparateur : total par magasin, économies, couverture, tableau produit par magasin, historique des prix                    | À faire  |
| 5     | Panier optimal réparti sur 1 à 3 magasins                                                                                   | À faire  |
| 6     | Export PDF par magasin et tableau comparatif, impression                                                                    | À faire  |

Ensuite : application installable et utilisable hors ligne (PWA), puis synchronisation entre appareils avec Supabase, juste après la V1. Le code est préparé pour cette synchronisation : les données passeront par une interface de stockage unique, locale aujourd'hui, distante demain.

## Démarrer en local

Prérequis : Node.js 22 (20.19 au minimum) et npm.

```bash
git clone https://github.com/VOTRE-COMPTE/panier-malin.git
cd panier-malin
npm ci
npm run dev
```

L'application s'ouvre sur http://localhost:5173.

| Commande            | Rôle                                                          |
| ------------------- | ------------------------------------------------------------- |
| `npm run dev`       | Serveur de développement avec rechargement à chaud            |
| `npm run build`     | Vérification des types puis build de production dans `dist/`  |
| `npm run preview`   | Sert le build de production en local                          |
| `npm test`          | Tests unitaires et d'interface (Vitest, Testing Library, MSW) |
| `npm run lint`      | ESLint                                                        |
| `npm run format`    | Formate le code avec Prettier                                 |
| `npm run typecheck` | Vérification TypeScript seule                                 |

## Organisation du code

```
src/
├── components/     composants d'interface (catalog, layout, providers, ui)
├── data/           catalogue (products.json), rayons, enseignes
├── hooks/          contextes React et état persistant
├── pages/          écrans : catalogue, liste
├── services/       logique métier pure et accès aux API, chacun avec ses tests
├── test/           configuration des tests et réponses simulées des API
├── types/          modèle de données TypeScript
└── utils/          texte, prix en centimes, codes-barres, unités, dates
```

La logique métier (filtres, liste, calculs de prix, comparaison) vit dans `src/services/` sous forme de fonctions pures, sans React, testées indépendamment de l'interface.

## Le catalogue

Le catalogue est un simple fichier, [`src/data/products.json`](src/data/products.json), modifiable par tous. Chaque ligne est une fiche produit :

```json
{
  "id": "lait-demi-ecreme-uht",
  "name": "Lait demi-écrémé UHT",
  "categoryId": "cremerie",
  "icon": "🥛",
  "pack": { "count": 1, "size": 1000, "unit": "ml" },
  "soldByWeight": false,
  "halal": false,
  "references": [
    { "enseigne": "carrefour", "brand": "Simpl", "ean": "" },
    { "enseigne": "lidl", "brand": "Milbona", "ean": "" },
    { "enseigne": "leclerc", "brand": "Eco+", "ean": "" }
  ]
}
```

| Champ               | Signification                                                                        |
| ------------------- | ------------------------------------------------------------------------------------ |
| `id`                | Identifiant stable et lisible, tiré du nom                                           |
| `pack`              | Format courant : `count` × `size` `unit` (`g`, `ml` ou `piece`) ; 1 kg pour le vrac  |
| `soldByWeight`      | Vendu au poids : la quantité de la liste est exprimée en kg                          |
| `halal`             | Viande, volaille ou charcuterie certifiée halal                                      |
| `references`        | Pour chaque enseigne, au plus une référence : sa gamme la moins chère connue         |
| `references[].ean`  | Code-barres EAN-8 ou EAN-13 ; chaîne vide tant qu'il n'a pas été vérifié             |
| `references[].pack` | Format de la référence, s'il diffère de celui de la fiche (couches par 44 ou par 48) |
| `offCategoryTag`    | Pour le vrac : catégorie Open Food Facts utilisée par les prix au kilo d'Open Prices |

Une fiche sans référence est normale pour le vrac (fruits, légumes, pain) et pour la viande halal, dont les références restent à trouver : son prix viendra des relevés au kilo d'Open Prices ou de vos propres saisies.

### Un catalogue halal

Le catalogue partagé ne contient ni porc ni dérivés, aucune boisson alcoolisée, aucun produit à base de gélatine, et uniquement de la viande, de la volaille et de la charcuterie certifiées halal. Poissons, fruits de mer et fromages sont conservés. Ces règles sont vérifiées automatiquement par les tests à chaque modification du catalogue ; elles ne s'appliquent pas aux produits personnalisés, qui restent sur votre appareil.

Les cas limites (arômes, additifs d'origine animale, alcool utilisé en cuisine) ne peuvent pas être détectés à partir du seul nom d'un produit : ils seront contrôlés avec les ingrédients et les labels d'Open Food Facts quand les codes-barres seront renseignés. La sauce soja, qui contient souvent de l'alcool de fermentation, a été écartée par prudence.

### La référence la moins chère de chaque enseigne

Tant que les prix réels ne sont pas chargés, « la moins chère » repose sur les gammes des enseignes : Simpl quand le produit existe dans cette gamme, sinon Carrefour Classic' chez Carrefour ; les marques propres de Lidl ; Eco+ quand le produit existe dans cette gamme, sinon Marque Repère chez E.Leclerc. Les marques nationales et le bio ne sont pas retenus. Ces choix seront vérifiés avec les prix d'Open Prices et corrigés au besoin.

H Market et Marka Market sont gérées sans référence : je ne connais pas leurs marques propres. Leurs prix viendront de vos saisies, ou de contributeurs qui connaissent ces magasins.

Autres règles vérifiées par les tests : **un code-barres n'est jamais inventé** (tous sont vides dans le catalogue initial, et la clé de contrôle de chaque code saisi est vérifiée), une seule référence par enseigne et par fiche, et des formats comparables entre une fiche et ses références. Les formats du catalogue initial sont des formats courants, pas des relevés : ils peuvent différer légèrement du produit en rayon.

Pour ajouter une fiche ou corriger une référence, suivez le [guide de contribution](CONTRIBUTING.md) ou ouvrez un ticket avec le modèle correspondant.

## Données Open Prices et Open Food Facts

L'application interroge directement, depuis votre navigateur :

- **Open Food Facts** pour retrouver un produit à partir de son code-barres (nom, marque, photo, format) ;
- **Open Prices** (à partir de l'étape 3) pour les prix relevés en magasin, les magasins, et l'historique des prix.

Ces données sont collaboratives : des bénévoles photographient des tickets et des étiquettes. Elles sont donc **incomplètes et parfois anciennes**. L'application le montre toujours : chaque prix indique sa source, sa date et son magasin, un prix de plus de trois mois est signalé, et un produit sans relevé affiche « Prix non disponible » avec la possibilité de saisir son propre prix.

Pour respecter ces services gratuits, l'application :

- espace ses appels à Open Food Facts de 4 secondes, dans la limite de 15 lectures de produit par minute indiquée par leur documentation ;
- garde en cache les fiches produits 30 jours (1 jour pour un produit introuvable) ;
- regroupera ses demandes de prix par lots et les gardera en cache 24 heures.

Vous pouvez enrichir ces bases vous-même sur [Open Prices](https://prices.openfoodfacts.org) et [Open Food Facts](https://world.openfoodfacts.org) : chaque relevé ajouté profite à tous.

**Licence des données.** Open Prices et Open Food Facts sont publiés sous [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/). L'application les cite dans son pied de page. Toute base de données dérivée et rendue publique devrait elle aussi être publiée sous ODbL.

## Méthode de comparaison (étapes 4 et 5)

Les règles ci-dessous ont été arrêtées avant l'implémentation ; elles seront codées dans `src/services/pricing.ts` et `src/services/comparator.ts`, avec leurs tests.

- **Calculs en centimes entiers**, jamais en nombres à virgule, pour que les totaux tombent juste.
- **Un prix par fiche et par magasin** : celui de la référence de l'enseigne, ou le prix au kilo du vrac. Quand le format de la référence diffère de celui de la fiche (couches par 44 ou par 48), le prix est ramené à l'unité, au kilo ou au litre avant d'être comparé.
- **Choix du prix** : votre saisie manuelle passe d'abord ; puis le relevé le plus récent du magasin ; à défaut, un relevé d'un autre magasin de la même enseigne, signalé comme tel (option désactivable). Les prix promotionnels sont écartés, sauf si le prix hors promotion est connu.
- **Deux modes de total** : « Articles communs » compare les magasins sur les seuls articles dont le prix est connu partout ; « Estimation complète » inclut tout ce qui est connu et affiche le taux de couverture.
- **Panier optimal** : toutes les combinaisons de 1 à 3 magasins sont évaluées (175 combinaisons pour 10 magasins). La combinaison retenue couvre le plus d'articles, puis coûte le moins cher, chaque magasin supplémentaire devant faire économiser au moins le seuil choisi (par exemple 3 €). Les articles sans prix sont signalés « à vérifier ».

## Déployer sur GitHub Pages

1. Créez un dépôt sur GitHub et poussez-y le code.
2. Dans le dépôt : **Settings > Pages > Build and deployment > Source : GitHub Actions**.
3. Chaque mise à jour de la branche `main` lance le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) : lint, formatage, types, tests, build, puis publication sur `https://VOTRE-COMPTE.github.io/NOM-DU-DEPOT/`. Les propositions de modification (pull requests) sont vérifiées sans être publiées.
4. Remplacez l'adresse du dépôt dans [`src/config.ts`](src/config.ts) : elle est affichée dans le pied de page.

Le chemin du site suit automatiquement le nom du dépôt (variable `BASE_PATH`). Les adresses internes utilisent une ancre (`…/#/liste`), car GitHub Pages ne sait pas servir une application à pages multiples : un rafraîchissement sur `/liste` renverrait sinon une erreur 404.

## Données personnelles

- Pas de compte, pas de serveur, pas de mesure d'audience.
- La liste, les préférences et les produits personnalisés sont enregistrés dans le stockage local du navigateur. Vider les données du site les efface.
- Les recherches par code-barres, et plus tard les demandes de prix, partent de votre navigateur vers Open Food Facts et Open Prices, qui voient donc votre adresse IP, comme pour toute visite de leur site.

## Choix techniques

- React 18, Vite 7, TypeScript strict, Tailwind CSS 4, React Router 7, icônes Lucide.
- Tests : Vitest 3, Testing Library, MSW 2 pour simuler les API sans réseau.
- Les versions majeures sont épinglées sur des versions dont l'API a été vérifiée pendant le développement ; des versions plus récentes existent (Vite 8, Vitest 5, ESLint 10, MSW 3) et pourront être adoptées après vérification.
- Les données locales sont enregistrées avec un numéro de schéma, pour pouvoir migrer les listes des utilisateurs quand le modèle évolue.

## Contribuer

Les contributions sont bienvenues, en particulier pour compléter le catalogue et vérifier les codes-barres. Consultez le [guide de contribution](CONTRIBUTING.md).

## Licence et marques

Le code est publié sous [licence MIT](LICENSE). Les données de prix et de produits appartiennent à leurs projets respectifs et sont publiées sous ODbL.

Les noms d'enseignes et de marques cités appartiennent à leurs propriétaires. Ce projet n'est affilié à aucune enseigne et n'utilise aucun logo officiel : chaque enseigne est représentée par un badge coloré portant son nom.
