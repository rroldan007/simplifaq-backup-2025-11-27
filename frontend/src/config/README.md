# Configuration des Taux de TVA Suisse

Ce dossier contient la configuration des taux de TVA (Taxe sur la Valeur Ajoutée) suisses utilisés dans l'application Simplifaq.

## Taux Actuels (2025)

Les taux de TVA suisses en vigueur depuis le 1er janvier 2025 sont :

- **0%** - Prestations exonérées de TVA
- **2.6%** - Taux réduit (biens de première nécessité, médicaments, livres, journaux)
- **3.8%** - Taux réduit spécial (prestations d'hébergement - hôtels, restaurants)
- **8.1%** - Taux normal (taux standard pour la plupart des biens et services)

## Historique des Changements

### 2025 (Actuel)
- Taux normal : 7.7% → **8.1%**
- Taux réduit : 2.5% → **2.6%**
- Taux réduit spécial : 3.7% → **3.8%**
- Exonéré : 0% (inchangé)

### 2024 (Précédent)
- Taux normal : 7.7%
- Taux réduit spécial : 3.7%
- Taux réduit : 2.5%
- Exonéré : 0%

## Comment Mettre à Jour les Taux

### 1. Modification Simple
Pour mettre à jour les taux de TVA, modifiez le fichier `swissTaxRates.ts` :

```typescript
export const SWISS_TVA_RATES_2026: TaxRate[] = [
  {
    value: 0,
    label: '0% (Exonéré)',
    description: 'Prestations exonérées de TVA',
    effectiveFrom: '2026-01-01'
  },
  // ... autres taux
];

// Mettre à jour la référence actuelle
export const CURRENT_SWISS_TVA_RATES = SWISS_TVA_RATES_2026;
export const DEFAULT_TVA_RATE = 8.5; // Nouveau taux normal
```

### 2. Composants Affectés
Les composants suivants utilisent automatiquement les nouveaux taux :
- `InvoiceItemsTable` - Sélection des taux dans le formulaire
- `InvoiceForm` - Taux par défaut pour nouveaux articles

### 3. Tests à Mettre à Jour
Après modification des taux, vérifiez et mettez à jour :
- Tests unitaires des composants de facture
- Tests de calcul de TVA
- Données de test (mock data)

## Structure du Fichier de Configuration

```typescript
interface TaxRate {
  value: number;           // Taux en pourcentage (ex: 8.1)
  label: string;          // Libellé affiché (ex: "8.1% (Taux normal)")
  description?: string;   // Description détaillée
  effectiveFrom?: string; // Date d'entrée en vigueur
  effectiveTo?: string;   // Date de fin (optionnel)
}
```

## Fonctions Utilitaires

### `getTaxRatesForDate(date: Date)`
Retourne les taux de TVA applicables à une date donnée (future enhancement).

### `getDefaultTaxRateForDate(date: Date)`
Retourne le taux normal par défaut pour une date donnée.

## Sources Officielles

Pour les mises à jour officielles des taux de TVA suisses :
- [Administration fédérale des contributions (AFC)](https://www.estv.admin.ch/)
- [Loi sur la TVA (LTVA)](https://www.fedlex.admin.ch/eli/cc/2009/615/fr)

## Notes Importantes

1. **Validation** : Toujours vérifier les nouveaux taux avec les sources officielles
2. **Tests** : Exécuter tous les tests après modification des taux
3. **Documentation** : Mettre à jour cette documentation lors des changements
4. **Historique** : Conserver les anciens taux pour référence et compatibilité

## Migration Future

Pour une gestion plus avancée des taux historiques, considérer :
- Base de données pour stocker les taux avec dates d'application
- API pour récupérer les taux actuels
- Interface d'administration pour modifier les taux
- Validation automatique des factures selon la date d'émission