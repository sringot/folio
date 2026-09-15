# Portfolio — Sacha Ringot

Portfolio personnel d'un étudiant en **BTS SIO option SISR** : parcours,
réalisations professionnelles, veille technologique et certifications.

Site statique, sans framework ni étape de build : HTML, CSS et JavaScript
natifs. On ouvre un fichier, on le modifie, on recharge.

---

## Structure

```
.
├── index.html            Page principale (application mono-page : 5 vues)
├── certif-cnil.html      Présentation plein écran de la certification CNIL
├── 404.html              Page d'erreur
│
├── css/
│   ├── tokens.css        Couleurs, thèmes clair/sombre, reset, accessibilité
│   ├── portfolio.css     Styles de index.html
│   └── certif.css        Styles de la présentation
│
├── js/
│   ├── theme.js          Bascule clair/sombre (partagée par toutes les pages)
│   ├── portfolio.js      Navigation, filtres, modales, animations
│   └── certif.js         Navigation entre diapositives
│
├── assets/               Images et PDF — voir assets/README.md
├── robots.txt
└── sitemap.xml
```

`css/tokens.css` est la **source unique des couleurs**. Les deux pages
partagent la même palette : modifier une variable là met à jour tout le site.

---

## Lancer en local

Les pages appellent des fichiers CSS et JS séparés : il faut un vrai serveur
HTTP, un double-clic sur `index.html` (`file://`) ne suffit pas partout.

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

---

## Modifier le contenu

| Ce qu'on veut changer               | Où                                                              |
| ----------------------------------- | --------------------------------------------------------------- |
| Texte d'accueil, à propos           | `index.html`, sections `view-home` / `view-parcours`             |
| Ajouter une formation               | `index.html`, bloc `.timeline` — alterner `timeline-right` / `timeline-left` |
| Ajouter une réalisation             | `index.html`, bloc `.missions-grid` — copier un `<article class="mission-card">` |
| Filtres d'une réalisation           | attributs `data-category` (`pro` / `ecole` / `perso`) et `data-skills` |
| Article de veille / lab             | `index.html`, `<article class="article-body">` dans `#articleModal` |
| Scores CNIL                         | `certif-cnil.html` (`data-score`) **et** `js/portfolio.js` (`CNIL_MODULES`) |
| Couleurs, thèmes                    | `css/tokens.css`                                                 |
| Domaine du site                     | balises `canonical` / `og:url`, `robots.txt`, `sitemap.xml`       |

### Ajouter une réalisation

```html
<article class="mission-card card-visible" data-category="pro" data-skills="patrimoine,service">
    <div class="mission-card-tags">
        <span class="mission-type-tag">Pro</span>
        <span class="mission-competence-tag">Gérer le patrimoine</span>
    </div>
    <h3>Titre de la réalisation</h3>
    <p>Description : contexte, ce qui a été fait, résultat.</p>
    <div class="tech-icons-row">
        <i class="devicon-debian-plain colored tech-icon"
           role="img" aria-label="Debian" title="Debian" data-label="Debian"></i>
    </div>
</article>
```

Les valeurs possibles de `data-skills` correspondent aux `data-filter` des
boutons du panneau « Filtrer » : `patrimoine`, `incidents`, `presence`,
`projet`, `service`, `e6`.

---

## Choix techniques

- **Thème appliqué avant le premier rendu.** Un court script dans le `<head>`
  lit `localStorage` et pose l'attribut `data-theme` : plus de flash blanc au
  chargement en mode sombre.
- **Une URL par vue.** `#parcours`, `#missions`, `#veille`, `#contact` : les
  liens sont partageables et le bouton « retour » du navigateur fonctionne.
- **Aucun gestionnaire `onclick` dans le HTML.** Tout passe par des attributs
  `data-*` et une délégation d'événements, ce qui garde le balisage lisible.
- **Dégradation propre.** Une image absente devient un cadre neutre ; si le CDN
  des icônes techno est injoignable, le nom de la techno s'affiche à la place.
- **Accessibilité.** Lien d'évitement, navigation clavier complète, focus piégé
  dans les modales et restitué à la fermeture, `prefers-reduced-motion` respecté.

## Dépendances externes

| Ressource       | Source                    | Si indisponible                          |
| --------------- | ------------------------- | ---------------------------------------- |
| Police Inter    | Google Fonts              | police système                            |
| Fraunces + Plus Jakarta Sans | Google Fonts | police système                            |
| Icônes Devicon  | jsDelivr (`devicon@latest`) | nom de la techno en texte               |

## Déploiement — GitHub Pages

1. *Settings* → *Pages* → *Source* : **Deploy from a branch**
2. Branche `main`, dossier `/ (root)`
3. Pour le domaine `sacharingot.fr` : renseigner *Custom domain* dans la même
   page **après** avoir fait pointer le DNS. GitHub crée alors le fichier
   `CNAME` lui-même — ne pas l'ajouter à la main avant que le DNS soit en place,
   le site deviendrait inaccessible.

---

© Sacha Ringot
