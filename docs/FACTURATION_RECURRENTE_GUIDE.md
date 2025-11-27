# Guide du Système de Facturation Récurrente

Ce document décrit l'implémentation de la fonctionnalité de facturation récurrente et les étapes nécessaires pour son intégration complète.

## 1. Modifications de la Base de Données

La base de données a été mise à jour pour prendre en charge la récurrence et les notifications.

**Fichier modifié** : `backend/prisma/schema.prisma`

### Nouvel Enum `FrequenceRecurrence`

Un `enum` a été ajouté pour définir les fréquences de récurrence autorisées :

```prisma
enum FrequenceRecurrence {
  MENSUEL
  TRIMESTRIEL
  SEMESTRIEL
}
```

### Nouveaux Champs sur le Modèle `Invoice`

Les champs suivants ont été ajoutés au modèle `Invoice` pour gérer la logique de récurrence :

- `estRecurrente` (Boolean?): Marque une facture comme étant la "facture maîtresse" d'une série récurrente.
- `frequence` (FrequenceRecurrence?): La fréquence de la récurrence (mensuelle, trimestrielle, etc.).
- `dateFinRecurrence` (DateTime?): La date à laquelle la série de factures doit s'arrêter.
- `prochaineDateRecurrence` (DateTime?): La date à laquelle la prochaine facture de la série doit être générée.
- `statutRecurrence` (String?): Le statut du cycle de vie de la récurrence (`inactif`, `actif`, `en_pause`, `termine`).
- `factureParenteId` (String?): Un lien vers la facture maîtresse pour tracer l'origine des factures générées.

### Nouveau Modèle `Notification`

Un modèle `Notification` a été créé pour stocker les notifications destinées aux utilisateurs, notamment lorsqu'une facture récurrente est générée.

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  invoiceId String?
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  // ... relations
}
```

## 2. Worker Automatisé

Un script automatisé a été créé pour gérer la génération des factures.

- **Fichier** : `backend/src/scripts/recurring-invoices.ts`

### Logique

Le script s'exécute et effectue les actions suivantes :
1.  Recherche toutes les factures maîtresses dont le statut est `actif` et dont la `prochaineDateRecurrence` est arrivée à échéance.
2.  Pour chaque facture trouvée, il **clone** la facture maîtresse, y compris ses lignes d'articles, en créant une nouvelle facture avec un nouveau numéro et de nouvelles dates.
3.  Crée une **notification** pour l'utilisateur, l'informant que la nouvelle facture a été générée.
4.  **Met à jour** la facture maîtresse en calculant la prochaine date de récurrence ou en marquant la série comme `termine` si la date de fin est atteinte.

### Exécution Manuelle

Pour exécuter le worker manuellement, utilisez la commande suivante depuis le répertoire `backend`:

```bash
npm run worker:recurring
```

## 3. Nouvel API de Notifications

De nouveaux endpoints ont été créés pour permettre au frontend de gérer les notifications.

- `GET /api/notifications`
  - **Description** : Récupère toutes les notifications pour l'utilisateur authentifié, triées par date de création.
  - **Protection** : Requiert un token d'authentification.

- `POST /api/notifications/:id/read`
  - **Description** : Marque une notification spécifique comme lue.
  - **Protection** : Requiert un token d'authentification.

## 4. Prochaines Étapes (Intégration Requise)

Les étapes suivantes sont nécessaires pour que la fonctionnalité soit pleinement utilisable par les utilisateurs.

### a. Mise à jour de l'API de Création de Facture

Le endpoint `POST /api/invoices` doit être mis à jour pour accepter les nouveaux champs de récurrence (`estRecurrente`, `frequence`, `dateFinRecurrence`, etc.) lors de la création ou de la mise à jour d'une facture.

### b. Changements Frontend

- **Formulaire de Facture** : Ajouter des éléments d'interface (cases à cocher, sélecteurs) dans le formulaire de création/édition de facture pour permettre aux utilisateurs de définir une facture comme récurrente et de choisir une fréquence et une durée.
- **Interface de Notifications** : Implémenter un composant (par exemple, une icône de cloche dans l'en-tête) qui utilise les nouveaux endpoints de notification pour afficher les messages aux utilisateurs.

### c. Automatisation du Worker (Cron Job)

Pour que le système fonctionne de manière autonome, le script du worker doit être exécuté périodiquement à l'aide d'un cron job sur le serveur de production.

**Exemple de Cron Job (exécution tous les jours à 3h00 du matin) :**

```cron
0 3 * * * cd /chemin/vers/votre/projet/backend && npm run worker:recurring >> /var/log/cron-recurring-invoices.log 2>&1
```
