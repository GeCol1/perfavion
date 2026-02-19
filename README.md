# PerfAvion — App Nextcloud

Calculateur de performances et masse/centrage pour avions légers, intégré nativement dans Nextcloud.
Développé par Gérald COLIN à [l'aéroclub des Deux Sèvres](https://ac2ds.org).

Bons vols.

---

## ⚠ Avertissement

Ce calculateur est un outil d'aide à la préparation de vol.  
**Ne jamais l'utiliser comme substitut au manuel de vol certifié (AFM/POH).**

---

## Structure des fichiers

```
perfavion/
├── appinfo/
│   ├── info.xml          ← Métadonnées de l'app (nom, version, dépendances)
│   └── routes.php        ← Définition des routes URL
├── lib/
│   └── Controller/
│       └── PageController.php  ← Contrôleur PHP principal
├── templates/
│   └── main.php          ← Template HTML injecté dans le layout Nextcloud
├── css/
│   └── perfavion-style.css     ← Styles (variables CSS Nextcloud v32)
├── js/
│   └── perfavion-main.js       ← Logique JS (calculs, canvas, localStorage)
└── img/
    └── icon.svg          ← Icône dans la barre de navigation
```

---

## Installation

### 1. Copier l'app sur le serveur

```bash
cp -r perfavion/ /var/www/nextcloud/apps/
```

> Le dossier doit s'appeler exactement `perfavion` (correspond à `<id>` dans `info.xml`).

### 2. Corriger les permissions

```bash
chown -R www-data:www-data /var/www/nextcloud/apps/perfavion/
chmod -R 755 /var/www/nextcloud/apps/perfavion/
```

> Adaptez `www-data` selon votre serveur (peut être `nginx`, `apache`, `http`...).

### 3. Activer l'app

**Via l'interface web :**  
Paramètres → Applications → chercher « PerfAvion » → Activer

**Via la ligne de commande (occ) :**
```bash
sudo -u www-data php /var/www/nextcloud/occ app:enable perfavion
```

### 4. Vider le cache (si nécessaire)

```bash
sudo -u www-data php /var/www/nextcloud/occ maintenance:repair
```

---

## Utilisation

Une fois activée, l'app apparaît dans la **barre de navigation Nextcloud** (icône avion).

- Les données avion sont stockées dans le **localStorage** du navigateur de chaque utilisateur.
- Chaque utilisateur peut configurer ses propres avions.
- Les calculs se font entièrement côté client (JavaScript), sans appel serveur.

---

## Mise à jour de la version Nextcloud compatible

Modifiez `appinfo/info.xml` :
```xml
<dependencies>
    <nextcloud min-version="28" max-version="32"/>
</dependencies>
```


