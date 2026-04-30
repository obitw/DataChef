# Projet Cloud — Plateforme de traitement de données asynchrone

## Contexte

Le projet consiste à concevoir et développer une plateforme permettant à des utilisateurs de :
- Enregistrer des datasources (jeux de données CSV ou JSON)
- Soumettre des jobs de transformation sur ces données
- Récupérer les résultats de manière asynchrone

L'objectif pédagogique principal n'est pas la richesse fonctionnelle de l'application, mais sa capacité à fonctionner correctement dans un environnement cloud : plusieurs instances en parallèle, configuration externalisée, état persisté en base de données, démarrage et arrêt propres.

L'application doit être déployable sur un PaaS — à la fois sur **Clever Cloud** et sur le PaaS développé par votre groupe ops partenaire.

---

## Objectifs pédagogiques

- Concevoir une application **cloud-native** (stateless, 12-factor, scalable horizontalement)
- Implémenter un traitement **asynchrone** découplé de la couche HTTP
- Collaborer avec une équipe ops pour définir et respecter un contrat de déploiement

---

## Fonctionnalités attendues

### Obligatoires

#### Gestion des utilisateurs

- Inscription et connexion
- Authentification par **JWT** — aucune session côté serveur
- Gestion de groupes : créer un groupe, rejoindre un groupe, lister les membres

#### Gestion des datasources

- `POST /datasources` — enregistrer une datasource (nom + données brutes CSV ou JSON)
- `GET /datasources` — lister ses datasources et celles partagées dans son groupe
- `GET /datasources/:id` — récupérer les métadonnées d'une datasource
- `DELETE /datasources/:id` — supprimer une datasource (refusé si un job est en cours dessus)

*Les datasources sont stockées en base de données. Aucune limite de taille n'est imposée par la spec — c'est un choix d'architecture à assumer.*

#### Soumission et suivi de jobs

- `POST /jobs` — soumettre un job (référence à une datasource + pipeline d'opérations)
- `GET /jobs` — lister ses jobs et ceux de son groupe
- `GET /jobs/:id` — récupérer le statut et le résultat d'un job

Un job passe par les états suivants : **pending → running → done | error**

#### Pipeline d'opérations

**Opérations obligatoires :**
- `filter` — filtrer les lignes selon une condition
- `aggregate` — calculer des statistiques sur une ou plusieurs colonnes
- `group_by` — grouper les lignes par une colonne et agréger par groupe

#### Endpoint de santé

- `GET /health` — retourne un statut HTTP 200 quand l'application est prête à recevoir des requêtes

### Optionnelles

- `select` — garder ou supprimer des colonnes
- `sort` — trier les lignes par une colonne
- `limit` — conserver les N premières lignes
- `deduplicate` — supprimer les lignes dupliquées sur une ou plusieurs clés
- Support des formats CSV et JSON en entrée et en sortie
- Pagination sur `GET /jobs` et `GET /datasources`
- Annulation d'un job en attente (`DELETE /jobs/:id`)
- Partage explicite d'une datasource avec un groupe (`POST /datasources/:id/share`)
- Mise à jour d'une datasource existante (`PUT /datasources/:id`)

### Bonus

- `join` — jointure entre deux jobs soumis préalablement
- File d'attente avec priorités
- Rejeu automatique d'un job en erreur
- **Datasources externes** — plutôt que d'uploader des données statiques, l'utilisateur enregistre une connexion vers une base de données externe. Les données sont extraites au moment de l'exécution du job via une requête SQL fournie à l'enregistrement. Bases supportées (au choix) : PostgreSQL, MySQL, SQLite. Les credentials sont stockés de façon sécurisée et ne sont jamais retournés dans les réponses API.

---

## Spécification des opérations

### Format général d'un job

```json
{
  "name": "nom du job",
  "datasource_id": "<uuid>",
  "pipeline": [
    { "op": "filter", ... },
    { "op": "group_by", ... }
  ]
}
```

Le champ `pipeline` est une liste ordonnée d'opérations appliquées séquentiellement sur les données de la datasource référencée.

### filter

Conserve uniquement les lignes satisfaisant une condition.

```json
{
  "op": "filter",
  "column": "age",
  "operator": ">",
  "value": 18
}
```

**Opérateurs supportés :** `>`, `<`, `>=`, `<=`, `==`, `!=`

### aggregate

Calcule des statistiques sur une ou plusieurs colonnes numériques. Retourne un objet (pas un tableau de lignes).

```json
{
  "op": "aggregate",
  "columns": ["price", "quantity"],
  "functions": ["sum", "avg", "median", "min", "max", "count"]
}
```

**Fonctions supportées :** `sum`, `avg`, `median`, `min`, `max`, `count`

### group_by

Regroupe les lignes par valeur d'une colonne catégorielle, puis applique une agrégation sur chaque groupe. Retourne un tableau avec une ligne par valeur distincte.

```json
{
  "op": "group_by",
  "by": "category",
  "aggregate": {
    "column": "revenue",
    "function": "sum"
  }
}
```

### select (optionnelle)

Conserve uniquement les colonnes spécifiées.

```json
{
  "op": "select",
  "columns": ["name", "age", "city"]
}
```

### sort (optionnelle)

Trie les lignes par une colonne.

```json
{
  "op": "sort",
  "column": "age",
  "order": "asc"
}
```

**order :** `asc` ou `desc`

### limit (optionnelle)

Conserve les N premières lignes après les opérations précédentes.

```json
{
  "op": "limit",
  "n": 100
}
```

### deduplicate (optionnelle)

Supprime les lignes dont les valeurs des colonnes spécifiées sont identiques. Conserve la première occurrence.

```json
{
  "op": "deduplicate",
  "columns": ["email"]
}
```

### join (bonus)

Joint les données courantes avec le résultat d'un job précédemment soumis.

```json
{
  "op": "join",
  "with_job_id": "<uuid>",
  "on": "user_id",
  "type": "inner"
}
```

**Types supportés :** `inner`, `left`

---

## Contraintes cloud-native

Ces contraintes sont évaluées indépendamment des fonctionnalités. Elles reflètent ce qu'on attend d'une application en production dans un environnement cloud.

- **Stateless** — l'application doit fonctionner correctement avec plusieurs instances en parallèle. Aucun état ne doit être stocké en mémoire ou sur le disque local entre deux requêtes.

- **Configuration externalisée** — toute configuration (base de données, secrets JWT, ports…) passe par des variables d'environnement. Aucune valeur sensible ne doit être en dur dans le code.

- **Persistance externe** — les données (datasources, jobs, utilisateurs, résultats) sont stockées en base de données. PostgreSQL est recommandé comme stockage principal. Aucun fichier ne doit transiter par le disque local.

- **Health endpoint** — `GET /health` répond 200 dès que l'application est prière. Utilisé par le PaaS pour le routage et les rolling updates.

- **Graceful shutdown** — l'application intercepte le signal SIGTERM et termine proprement les requêtes en cours avant de s'arrêter.

**La démonstration du scaling horizontal** (lancement de plusieurs instances simultanées, vérification du comportement correct) **est un critère d'évaluation explicite.**

---

## Organisation

- **Groupes :** 4 étudiants
- **Technologie imposée :** Git (versionning obligatoire)
- **Rendu :** URL du dépôt Git à enregistrer sur https://push.cloud.polytechdo3.fteychene.xyz/ avant la date limite

*La date limite de rendu sera communiquée en cours.*

### Binômage dev/ops

Chaque groupe dev est associé à un groupe ops qui développe son propre PaaS. L'application doit être déployée sur deux cibles :

1. **Clever Cloud** — déploiement de référence, indépendant du groupe ops
2. **PaaS du groupe ops partenaire** — déploiement en collaboration avec le groupe ops

Le groupe dev est responsable de fournir un **contrat de déploiement** au groupe ops :
- Liste des variables d'environnement requises
- Services nécessaires (base de données, etc.)
- Port d'écoute
- Chemin du health endpoint
- Procédure de mise à jour

Le format est libre.

**L'évaluation du déploiement sur le PaaS ops n'est pas bloquante** : si le PaaS partenaire ne permet pas le déploiement, le déploiement Clever Cloud fait foi.

---

## Rendu attendu

Le dépôt Git doit contenir :

- **Les sources de l'application**

- **Une documentation technique** couvrant :
  - Build — comment compiler/packager l'application
  - Installation — prérequis, variables d'environnement, base de données
  - Usage — exemples de requêtes couvrant les cas principaux (authentification, enregistrement d'une datasource, soumission d'un job, récupération du résultat)

- **Le contrat de déploiement** destiné au groupe ops partenaire

---

## Système de notation

| Critère | Points |
|---------|--------|
| **Fonctionnalités** | 10 |
| **Contraintes cloud-native** | 6 |
| **Documentation et contrat de déploiement** | 4 |
| **Total** | **20** |

### Fonctionnalités — 10 points

- Toutes les fonctionnalités obligatoires sont présentes et fonctionnelles
- Nombre et qualité des fonctionnalités optionnelles implémentées
- Absence de bugs bloquants lors de la démonstration

### Contraintes cloud-native — 6 points

- L'application est **stateless** : plusieurs instances fonctionnent correctement en parallèle (démonstration requise)
- La configuration est entièrement externalisée en variables d'environnement
- Le health endpoint est présent et fonctionnel
- L'application gère SIGTERM proprement

### Documentation et contrat de déploiement — 4 points

- La documentation permet d'installer et de lancer l'application sans aide
- Des exemples de requêtes couvrent les cas principaux
- Le contrat de déploiement est complet et exploitable par le groupe ops sans échange supplémentaire