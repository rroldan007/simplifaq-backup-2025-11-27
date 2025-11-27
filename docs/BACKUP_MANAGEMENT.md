# Gestion des Sauvegardes

Cette fonctionnalité permet aux administrateurs de gérer facilement les sauvegardes de la base de données directement depuis l'interface d'administration.

## Fonctionnalités

- Création de sauvegardes à la demande
- Restauration de la base de données à partir d'une sauvegarde
- Liste de toutes les sauvegardes disponibles
- Suppression des sauvegardes existantes
- Affichage des détails (taille, date de création)

## Comment ça marche

### Création d'une sauvegarde

1. Accédez à la section "Sauvegardes" dans le panneau d'administration
2. Cliquez sur le bouton "Créer une sauvegarde"
3. Attendez la confirmation de création

### Restauration d'une sauvegarde

1. Dans la liste des sauvegardes, trouvez la sauvegarde souhaitée
2. Cliquez sur le bouton "Restaurer"
3. Confirmez l'action dans la boîte de dialogue
4. L'application se rechargera automatiquement après la restauration

### Suppression d'une sauvegarde

1. Dans la liste des sauvegardes, trouvez la sauvegarde à supprimer
2. Cliquez sur le bouton "Supprimer"
3. Confirmez la suppression

## Emplacement des sauvegardes

Les sauvegardes sont stockées dans le répertoire `/backups` à la racine du projet backend.

## Sécurité

- Seuls les utilisateurs avec des privilèges d'administration peuvent accéder à cette fonctionnalité
- Les sauvegardes contiennent des données sensibles, assurez-vous de les stocker en toute sécurité
- Il est recommandé de configurer des sauvegardes automatiques en production

## Bonnes pratiques

1. Créez toujours une sauvegarde avant les mises à jour majeures
2. Testez régulièrement le processus de restauration
3. Stockez les sauvegardes dans un emplacement sécurisé hors site
4. Configurez une rotation des sauvegardes pour économiser de l'espace disque

## API Endpoints

- `GET /api/backups` - Liste toutes les sauvegardes
- `POST /api/backups` - Crée une nouvelle sauvegarde
- `POST /api/backups/:filename/restore` - Restaure une sauvegarde
- `DELETE /api/backups/:filename` - Supprime une sauvegarde

## Dépannage

### Problèmes courants

- **Espace disque insuffisant** : Vérifiez l'espace disque disponible avant de créer des sauvegardes
- **Échec de la restauration** : Assurez-vous que la base de données est accessible et que vous avez les bonnes permissions
- **Erreurs de permission** : Vérifiez que le serveur a les droits d'écriture dans le dossier de sauvegarde

### Journaux

Les erreurs sont enregistrées dans les journaux du serveur. Vérifiez les journaux pour plus d'informations en cas de problème.

## Utilisation en Ligne de Commande

### Création d'une Sauvegarde

```bash
# Depuis le répertoire backend
npm run backup:create
```

### Restauration d'une Sauvegarde

```bash
# Lancer l'assistant de restauration
npm run backup:restore

# Ou restaurer un fichier spécifique (sans l'assistant)
PGPASSWORD="votre_mot_de_passe" psql -h localhost -p 5432 -U utilisateur -d nom_de_la_base -f backups/nom_du_fichier.sql
```

### Configuration des Sauvegardes Automatiques

Pour configurer des sauvegardes automatiques quotidiennes à 2h du matin :

```bash
npm run backup:setup
```

Cela va :
1. Créer un travail cron pour exécuter les sauvegardes automatiquement
2. Tester la configuration avec une sauvegarde initiale
3. Configurer la rotation des sauvegardes (30 jours conservés par défaut)

### Liste des Sauvegardes

```bash
# Voir toutes les sauvegardes disponibles
npm run backup:list
```

## Configuration Avancée

### Variables d'Environnement

Les variables suivantes peuvent être configurées dans le fichier `.env` :

```
# Chemin du répertoire de sauvegarde (par défaut: ./backups)
BACKUP_DIR=./backups

# Nombre maximum de sauvegardes à conserver (par défaut: 30)
MAX_BACKUPS=30
```

### Rotation des Sauvegardes

La rotation des sauvegardes est gérée automatiquement. Par défaut, seules les 30 dernières sauvegardes sont conservées. Vous pouvez modifier cette valeur en ajustant la variable `MAX_BACKUPS` dans le script `auto-backup.ts`.

## Dépannage

### Problèmes Courants

#### Erreurs de Permission

```bash
chmod +x scripts/auto-backup.ts
chmod +x scripts/restore-backup.ts
chmod +x ../scripts/setup-backup-cron.sh
```

#### Espace Disque Insuffisant

Vérifiez l'espace disque disponible avant de créer des sauvegardes :

```bash
df -h
```

#### Journaux

Les journaux des sauvegardes automatiques sont enregistrés dans :
```
logs/backup.log
```

## Sécurité

- Les fichiers de sauvegarde contiennent des données sensibles
- Stockez-les dans un emplacement sécurisé avec des permissions restreintes
- Envisagez de chiffrer les sauvegardes avant de les stocker hors site
- Ne stockez jamais les mots de passe directement dans les scripts

## Sauvegarde dans un Cloud Storage (Optionnel)

Pour une meilleure résilience, vous pouvez configurer la synchronisation des sauvegardes avec un service de stockage cloud comme AWS S3, Google Cloud Storage, ou un serveur distant via SCP.

Exemple avec AWS S3 :

```bash
# Installer AWS CLI
apt-get install awscli

# Configurer les identifiants AWS
aws configure

# Synchroniser le dossier de sauvegarde avec S3
aws s3 sync ./backups s3://votre-bucket/backups/
```

## Surveillance

Pour surveiller l'état des sauvegardes, vous pouvez configurer une alerte en cas d'échec en utilisant un outil comme `logwatch` ou un service de surveillance externe.

## Maintenance

- Vérifiez régulièrement que les sauvegardes sont correctement créées
- Testez la restauration des sauvegardes dans un environnement de test
- Mettez à jour cette documentation si des changements sont apportés au système de sauvegarde
