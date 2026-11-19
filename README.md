# REDCHAT

Messagerie web minimaliste, thème **Black & White / Dark** par défaut, avec thèmes et couleurs personnalisables.

## Démarrage rapide

1. Téléchargez/cloner ce dépôt.
2. Ouvrez `index.html` avec un serveur local (par exemple l'extension **Live Server** de VS Code). Les modules JavaScript Firebase ne fonctionnent pas correctement via `file://`.
3. Sans configuration Firebase, REDCHAT fonctionne en **mode démo local** : les messages et préférences restent dans le navigateur utilisé.

## Activer les comptes et la messagerie partagée (Firebase)

1. Créez un projet sur [Firebase Console](https://console.firebase.google.com/).
2. Ajoutez une application Web et copiez la configuration fournie.
3. Dans `app.js`, remplacez les valeurs `REMPLACE_...` de `firebaseConfig`.
4. Dans Firebase Authentication → Sign-in method, activez **Email/Password**.
5. Dans Firestore Database, créez une base de données.
6. Dans l'onglet Rules de Firestore, copiez le contenu de `firebase.rules` puis publiez les règles.
7. Dans Authentication → Settings → Authorized domains, ajoutez le domaine GitHub Pages de votre site.

La configuration Firebase côté navigateur est conçue pour être publique. La sécurité repose sur les règles Firestore et les règles d'authentification : ne mettez jamais de clé privée de compte de service dans le dépôt.

## Publier sur GitHub Pages

1. Créez un dépôt GitHub, par exemple `redchat`.
2. Importez `index.html`, `style.css`, `app.js`, `firebase.rules` et `.nojekyll`.
3. Ouvrez Settings → Pages.
4. Dans Build and deployment, choisissez **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis Save.
5. Attendez le déploiement et ouvrez l'URL GitHub Pages affichée.

## Personnalisation

Dans Paramètres → Personnalisation :
- thèmes Black & White, Midnight et Light Minimal ;
- accent libre via le sélecteur de couleur ;
- couleur du fond, densité et taille du texte ;
- sauvegarde locale en mode démo ;
- sauvegarde dans le document privé `users/{uid}` si le compte Firebase est connecté.

## Limites de cette première version

- Les salons créés depuis l'interface sont locaux à la session/navigateur ; la création collaborative et les rôles d'administration ne sont pas encore implémentés.
- Les messages partagés sont accessibles aux utilisateurs connectés selon les règles Firestore ci-dessus. Pour une vraie application publique, ajoutez une gestion des membres et des autorisations par salon avant d'ouvrir des salons privés.
- Pas encore de pièces jointes, appels audio/vidéo, notifications push ni modération avancée.
- Firebase peut générer des coûts selon l'utilisation et les quotas de votre projet.

## Structure

```text
redchat/
├── index.html
├── style.css
├── app.js
├── firebase.rules
├── .nojekyll
└── README.md
```
