# assets/

Ce dossier contient les fichiers **non versionnés par le code** : photos, captures
d'écran, PDF. Les pages y font référence par des chemins fixes — il suffit de
déposer un fichier au bon nom pour qu'il apparaisse, sans toucher au HTML.

Tant qu'un fichier est absent, le site ne casse pas : un cadre neutre reprenant
le texte alternatif s'affiche à la place (voir `js/portfolio.js`, section 2).

## Fichiers attendus

| Chemin                          | Utilisé par                          | Format conseillé        |
| ------------------------------- | ------------------------------------ | ----------------------- |
| `cv.png`                        | Aperçu de la carte CV (Parcours)     | PNG, ~600 px de large   |
| `RINGOT-Sacha-cv.pdf`           | Téléchargement + visionneuse         | PDF                     |
| `tableau-synthese.png`          | Aperçu du tableau de synthèse (E5)   | PNG, ~600 px de large   |
| `tableau-synthese.pdf`          | Téléchargement + visionneuse         | PDF                     |
| `script1.png`                   | Visuel de la carte *catphisher*      | PNG, ratio ~16/9        |
| `portfolio.png`                 | Image de partage (OpenGraph)         | PNG **1200 × 630 px** † |
| `ipssi.webp`                    | Logo timeline — IPSSI                | carré, fond opaque      |
| `wee-technology.png`            | Logo timeline — Wee Technology       | carré, fond transparent |
| `42.png`                        | Logo timeline — École 42             | carré, fond opaque      |
| `descartes.png`                 | Logo timeline — Lycée Descartes      | carré, fond transparent |

† `portfolio.png` a été généré à partir de la page d'accueil (rendu 2400 × 1260,
soit 1200 × 630 en densité double). C'est la vignette affichée quand le lien du
portfolio est partagé sur LinkedIn, Discord ou dans un message. Remplace-le
librement par un visuel dessiné — garde juste le ratio 1,91:1.

## Attestations CNIL (facultatif)

| Chemin                    | Module                                      |
| ------------------------- | ------------------------------------------- |
| `cnil/module-1.png`       | Le RGPD et ses notions clés                 |
| `cnil/module-2.png`       | Les principes de la protection des données  |
| `cnil/module-3.png`       | Les responsabilités des acteurs             |
| `cnil/module-4.png`       | Le DPO et les outils de la conformité       |
| `cnil/module-5.png`       | Les collectivités territoriales             |
| `cnil/module-6.png`       | Travail et données personnelles             |

Sans ces images, la carte « Certification CNIL » affiche le **score obtenu**
pour chaque module à la place de l'attestation. Dès qu'un fichier est déposé,
il remplace automatiquement la vignette de score.

> Pense à masquer les informations personnelles inutiles (adresse, numéro de
> téléphone) avant de publier une attestation sur un site public.
