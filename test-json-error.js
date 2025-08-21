const express = require('express');
const app = express();

// Données de test exactes de Bubble
const testData = {
  "project_bubble_uniqueId": "1751634726443x470302460201926660",
  "filesUrls": [
    "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1751634908943x879596519496958600/IMG_1923.jpeg",
    "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1751634921777x920379779519970200/Insertion%2C%20Place%20Franc%C3%8C%C2%A7ois%201er%20final.jpg",
    "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1751897403923x988193113707294000/Acte%20du%2026%20octobre%202012.pdf",
    "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752605197540x346418453575767500/25058%20-%20REHABILATATION%20DE%20L%27APPARTEMENT%20N%C2%B07%20-%20indice%20B.%20-%20DEVIS%20CLIENT%20TCE%20-%202025%2006%2008.pdf",
    "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752605210574x293916366959966700/25058%20-%20REHABILATATION%20DE%206%20APPARTEMENTS%20DU%20N%C2%B01%20AU%20N%C2%B06%20-%20indice%20B.%20-%20DEVIS%20CLIENT%20TCE%20-%202025%2006%2008.pdf",
    "https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752605220274x679516896083760500/avis%20de%20valeur%207%20appts%20ARCADOM.pdf",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752679623007x564060210435302300/Extrait%20KBIS.pdf",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752679652832x283257305437437900/25058%20-%20REHABILATATION%20DE%206%20APPARTEMENTS%20DU%20N%C2%B01%20AU%20N%C2%B06%20-%20indice%20B.%20-%20DEVIS%20CLIENT%20TCE%20-%202025%2006%2008.pdf",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752679641910x147155937639713580/25058%20-%20REHABILATATION%20DE%20L%27APPARTEMENT%20N%C2%B07%20-%20indice%20B.%20-%20DEVIS%20CLIENT%20TCE%20-%202025%2006%2008.pdf",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752679641910x147155937639713580/25058%20-%20REHABILATATION%20DE%20L%27APPARTEMENT%20N%C2%B07%20-%20indice%20B.%20-%20DEVIS%20CLIENT%20TCE%20-%202025%2006%2008.pdf",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752679660998x315126197840482000/avis%20de%20valeur%207%20appts%20ARCADOM.pdf",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752679882306x287712722560111700/Phase%202%20Vue%20Nocturne.jpg",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752679938217x320957519207114560/Vues%20a%C3%A9riennes%20partie%202.JPG",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752679949734x338556139035793600/Vue%208.JPG",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752679926464x161324245613102980/Insertion%2C%20Place%20Franc%C3%8C%C2%A7ois%201er%20final.jpg",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752845312629x212084027449518600/Accord%20Mairie%20DPC.pdf",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1752845299254x340106997267920700/Arr%C3%AAt%C3%A9%20PC.pdf",
    "https:https://6c3983e807cb4a584386b022713aa762.cdn.bubble.io/f1755768060109x536950069066490800/kbis.pdf"
  ],
  "projectName": "Les Salons de la Cité",
  "conversations": `Auteur : Porteur de projet
Message : Bonjour, votre tableur est trop restrictif. Je recherche un financement de 750 000 euros (cout total) pour réaliser des travaux dans la dernière partie d'un bâtiment que nous savons entièrement rénové. Ce financement permettra de commercialiser 7 appartements pour une valeur de 2 000KE. Les garanties sont faciles à proposer.
Ce n'est pas une opération en VEFA, nous devons donc réaliser les appartements pour les vendre.
_

Auteur : Membre de l'équipe Bricks
Message : Bonjour,
Merci pour les précisions. Dans le tableau dans coûts, vous pouvez mettre 0€ en coût d'acquisition étant donné que vous possédez déjà le bien et indiquer les coûts des travaux dans la section dédiée.
[justify][highlight=transparent]Voici les documents requis dans le cadre d'un projet de marchand de biens :&nbsp;[/highlight][/justify]
[justify][/justify]
[ml][ul][li indent=0 align=left][highlight=transparent]Fiche détaillée[/highlight][/li][li indent=0 align=left][highlight=transparent]Compromis de vente&nbsp;ou titre de propriété[/highlight][/li][li indent=0 align=left][highlight=transparent]Preuve de fonds propre [/highlight](une capture d'écran du compte portant l'apport suffit / 10 à 15% d'apport sont généralement souhaités)[/li][li indent=0 align=left][highlight=transparent]Si découpe[/highlight][/li][ul data=1][li indent=1 align=left][highlight=transparent]Permis d'aménager[/highlight][/li][/ul][li indent=0 align=left][highlight=transparent]Permis de construire / décla préalable&nbsp;[/highlight][/li][li indent=0 align=left][highlight=transparent]Prévisionnel de l'opération (prix acquisition, montant travaux, marge)[/highlight][/li][li indent=0 align=left][highlight=transparent]Société (SIREN) / Nous ne pouvons pas financer les SCI et SCCV[/highlight][/li][li indent=0 align=left][highlight=transparent]Si travaux :&nbsp;[/highlight][/li][ul data=1][li indent=1 align=left][highlight=transparent]Devis[/highlight][/li][/ul][li indent=0 align=left][highlight=transparent]Avis de valeur lots à revendre et biens à acheter (réalisés par agence immo)&nbsp;[/highlight][/li][/ul][/ml][justify][highlight=transparent]Merci de privilégier le format PDF (y compris pour les fichiers Excel).[/highlight][/justify]
[justify][highlight=transparent]Une fois cela réalisé, nous pourrons envoyer votre dossier en analyse pour vous donner un retour et un premier accord de principe si le projet répond à nos critères. ✅[/highlight][/justify]
[justify][highlight=transparent]Belle journée,[/highlight][/justify]
[justify][highlight=transparent]Franck 🧱[/highlight][/justify]


_

Auteur : Porteur de projet
Message : Ok, je reviens vers vous avec les informations. Cordialement
_

Auteur : Membre de l'équipe Bricks
Message : vu
_

Auteur : Porteur de projet
Message : Bonjour,

Le projet semble ne pas correspondre à vos demandes formatées. Pourrais je échanger avec vous pour vous expliquer la demande et adapter les pièces nécessaires à votre étude ?
_

Auteur : Membre de l'équipe Bricks
Message : Bonjour,
Le projet entre bien dans nos critères. Avez-vous un business plan avec un prévisionnel détaillé ? Nous nous appuierons sur ce document.
Merci
Franck
_

Auteur : Porteur de projet
Message : Bonjour,

J'ai bien reçu votre message. Notre projet est très simple. Nous sommes encore propriétaire de 1200 m² d'un bâtiment que nous avons entièrement réhabilité au cantre de Cognac (les Salons de la Cité). Nous souhaitons aménager ces dernier m² en appartements. Ce n'es que de l'aménagement intérieur, les  structures existe et est strictement conforme.
Les devis établis par l'entreprise Viquin (Groupe Fayat) s'élèvent à 962 992 euros TTC
Les prévisions de ventes des 7 appartements ainsi réalisés sont de 2 000 000 euros TTC auxquels s'ajouteront 23 places de parking intérieures et un local commercial pour environ 450 000 euros TTC .
Nous sollicitons un financement à hauteur de 750000 euros sur 18 mois maximum.
Cordialement.
Joel JOANNY
_

Auteur : Membre de l'équipe Bricks
Message : Merci pour les précisions.
Afin d'avancer et d'envoyer votre dossier en analyse, pouvez-vous ajouter ces éléments :
[ml][ul][li indent=0 align=left][highlight=transparent]Titre de propriété[/highlight][/li][li indent=0 align=left][highlight=transparent]Preuve de fonds propre [/highlight](une capture d'écran du compte portant l'apport suffit / 10 à 15% d'apport sont généralement souhaités)[/li][li indent=0 align=left][highlight=transparent]Si découpe[/highlight][/li][ul data=1][li indent=1 align=left][highlight=transparent]Permis d'aménager[/highlight][/li][/ul][li indent=0 align=left][highlight=transparent]Permis de construire / décla préalable&nbsp;[/highlight][/li][li indent=0 align=left][highlight=transparent]Prévisionnel de l'opération (prix acquisition, montant travaux, marge)[/highlight][/li][li indent=0 align=left][highlight=transparent]Société (SIREN) / Nous ne pouvons pas financer les SCI et SCCV[/highlight][/li][li indent=0 align=left][highlight=transparent]Si travaux :&nbsp;[/highlight][/li][ul data=1][li indent=1 align=left][highlight=transparent]Devis[/highlight][/li][/ul][li indent=0 align=left][highlight=transparent]Avis de valeur lots à revendre et biens à acheter (réalisés par agence immo)&nbsp;[/highlight][/li][/ul][/ml][justify][highlight=transparent]Merci de privilégier le format PDF (y compris pour les fichiers Excel).[/highlight][/justify]
[justify][highlight=transparent]Une fois cela réalisé, nous pourrons envoyer votre dossier en analyse pour vous donner un retour et un premier accord de principe si le projet répond à nos critères. ✅[/highlight][/justify]
[justify][highlight=transparent]Belle journée,[/highlight][/justify]
[justify][highlight=transparent]Franck 🧱[/highlight][/justify]


_

Auteur : Membre de l'équipe Bricks
Message : Bonjour, suite à mon appel, je viens de passer sur le dossier.
Afin de pouvoir l'envoyer en analyse, nous avons besoin de certains éléments complémentaires :
[ml][ul][li indent=0 align=left][highlight=transparent]Preuve de fonds propre [/highlight](une capture d'écran du compte portant l'apport suffit / 10 à 15% d'apport sont généralement souhaités)[/li][li indent=0 align=left][highlight=transparent]Si découpe[/highlight][/li][ul data=1][li indent=1 align=left][highlight=transparent]Permis d'aménager[/highlight][/li][/ul][li indent=0 align=left][highlight=transparent]Prévisionnel de l'opération (prix acquisition, montant travaux, marge)[/highlight][/li][li indent=0 align=left]Kbis de la société portant l'opération[/li][/ul][/ml]Une fois reçu, j'enverrai le dossier en analyse afin de vous faire un retour.
Merci
Franck
_

Auteur : Porteur de projet
Message : Désolé, mais je ne réussi pas à vous envoyer les documents....
_

Auteur : Membre de l'équipe Bricks
Message : Pas de souci, vous pouvez les envoyer dans la messagerie ici directement
_

Auteur : Porteur de projet
Message : Avez vous reçu les documents ?
_

Auteur : Porteur de projet
Message : OK ?
_

Auteur : Porteur de projet
Message : Photos

_

Auteur : Membre de l'équipe Bricks
Message : Bien reçu merci.
Hormis le Kbis et certaines images, vous aviez déjà envoyé le reste.
Je vous laisse me dire lorsque vous avez pu ajouter les éléments suivants :
[ml][ul][li indent=0 align=left][highlight=transparent]Preuve de fonds propre [/highlight](une capture d'écran du compte portant l'apport suffit / 10 à 15% d'apport sont généralement souhaités)[/li][li indent=0 align=left][highlight=transparent]Si découpe[/highlight][/li][ul data=1][li indent=1 align=left][highlight=transparent]Permis d'aménager[/highlight][/li][/ul][li indent=0 align=left][highlight=transparent]Prévisionnel de l'opération (prix acquisition, montant travaux, marge)[/highlight][/li][/ul][/ml]Merci
Franck
_

Auteur : Porteur de projet
Message : Je vous ai transmis le montant des travaux et le CA réalisé, la marge en découle (l'avez vous bien reçu, c'est dans le dernier message.
Pas de prix d'acquisition puisque propriétaire depuis 2012.
_

Auteur : Membre de l'équipe Bricks
Message : Bonjour,
J'ai effectivement le montant des travaux mais je n'ai pas de prévisionnel, seulement un avis de valeur des logements. Je vais chiffrer par moi-même.
En revanche je n'ai pas de justificatif d'apport ni d'info sur le permis ou la déclaration préalable s'il y en a.
Pouvez-vous m'envoyer cela ?
Merci
Franck
_

Auteur : Porteur de projet
Message : Le résultat est légèrement supérieur à  1M d'Euros
Pas de permis spécifique ou de déclaration préalable, nous sommes dans le cadre d'un PC initial de 2012 modifié.
Je vous adresse la dernière version mais qui ne vous sera d'aucune utilité.(-il est toujours en cours...)  (donc pas de déclaration préalable( 
Les comptes courants de la holding financière ont été orientés vers un autre projet.
Un débocage de fonds est néanmoins prévu à hauteur de 150KE dès un accord de financement du projet 
Cordialement.
Joel JOANNY
_

Auteur : Porteur de projet
Message : Permis de construire
_

Auteur : Membre de l'équipe Bricks
Message : Projet Mdb 
Vente de 7 appartements après travaux dans un bâtiment déjà acquis
800K€ de travaux HT
Revente estimée à 1M€
Apport 150K€ possible si accord de financement
La renta me parait faible pour l'envergure du projet et des travaux + Pdp pas super aidant sur les pièces (prévisionnel à calculer par moi-même)
_

Auteur : Membre de l'équipe Bricks
Message : Bien reçu merci.
Effectivement un apport de minimum 10% à 15% est généralement demandé pour notamment garantir les intérêts à payer dès le déblocage des fonds, mensuellement.
Je viens d'envoyer le dossier en analyse.
Comptez un délai d'environ 15 jours ouvrés pour avoir une réponse.
Je reste disponible si besoin.
Bonne soirée,
Franck
_

Auteur : Porteur de projet
Message : Bonjour, merci pour ce retour.
Merci de me donner quelques détails du fonctionnement de vos apports en c as d'acceptation du dossier.
_

Auteur : Membre de l'équipe Bricks
Message : Bonjour, 
Je ne comprends pas votre demande. Une fois le dossier accepté de notre côté, nous vous proposons la signature des contrats entrainant la publication de votre projet pour la collecte auprès des investisseurs. Une fois les fonds collectés (en 48h en moyenne), il faut compter une dizaine de jours pour le versement des fonds sur votre compte. 
Les frais Bricks sont à régler au moment du versement des fonds.
Les intérêts sont mensualisés.
Le capital peut être remboursé une fois l'opération terminée, à la fin du prêt ou de manière anticipée selon vos préférences.
[justify][highlight=transparent]Voici nos frais détaillés :[/highlight][/justify]
[justify][highlight=transparent]- 7,2 % de frais de collecte au moment du déblocage des fonds, sur le montant total levé.[/highlight][/justify]
[justify][highlight=transparent]- 1,2 % de frais de gestion annuel.[/highlight][/justify]
[justify][highlight=transparent]- Le taux d'intérêt annuel à reverser aux investisseurs mensuellement entre 9 % et 12 %/an.[/highlight][/justify]
En espérant que cela réponde à votre question.
Bonne journée,
Franck
_

Auteur : Porteur de projet
Message : C'est ce que je voulais savoir, je vous en remercie.
Cordialement./
Joel JOANNY
_

Auteur : Membre de l'équipe Bricks
Message : vu
_

Auteur : Membre de l'équipe Bricks
Message : Bonjour Joël,
Je viens d'avoir un premier retour.
Pour avancer, il me manque encore :
 – le prévisionnel détaillé (surfaces, planning, prix de vente, flux de trésorerie) ;
 – la preuve de l'apport de 150 k€ ;
 – le titre de propriété ;
 – les devis travaux signés et ventilés.
Dès réception de ces pièces, je renverrai le dossier en analyse pour avancer.
Bonne journée,
Franck
_

Auteur : Porteur de projet
Message : Désolé, mais je ne vois pas ce que je peux vous envoyer de plus!!!
Vous avez les devis (Vilquin)
Vous avez les prix de vente et les surfaces
Cette propriété nous appartient (voie me PC)
Manque la validation de l'apport, sera débloqué dés accord de principe.
Cordialement.
Joel JOANNY
_

Auteur : Membre de l'équipe Bricks
Message : Pour toute demande de financement, un prévisionnel est demandé afin de lister les coûts et les recettes.
Les devis et avis de valeur sont là pour justifier le prévisionnel.
C'est ok pour le PC.
Pour l'apport, vous n'avez pas le moyen de fournir ne serait-ce qu'une capture d'écran du compte qui le porte actuellement ?
Merci
Franck
_

Auteur : Membre de l'équipe Bricks
Message : Bonjour Joel,
Suite à mon dernier message resté sans retour, pouvez-vous me dire si votre demande est toujours d'actualité ou si vous préférez l'archiver ?
Merci
Franck
_

Auteur : Porteur de projet
Message : Bonjour,

Elle est toujours d'actualité, 
Mais en ce qui concerne nos apports, la holding porteuse des projets,  (ma famille)  ne libérera les fonds nécessaires qu'au début des travaux prévus mi septembre.
Une première avance sera versée (70KE) avant cette fin de mois d'aout.
Ceci dit, nous devrons savoir rapidement si vous souhaitez participer ou si nous devons prendre nos dispositions.
Cordialement.
Joel JOANNY

_

Auteur : Membre de l'équipe Bricks
Message : Merci pour votre retour et pour les précisions.
Donc si je comprends bien, l'apport servira à financer des travaux ?
Merci
Franck
_

Auteur : Membre de l'équipe Bricks
Message : Bonjour Joel,
Avez-vous bien reçu mon message il y a une semaine ?
Merci
Franck
_

Auteur : Porteur de projet
Message : Bonjour,

je suis "Marchand de biens", les liquidités vont...et viennent.
Pour garantir la bonne réalisation  des travaux, nous nous assurons  d'avoir la totalité des fonds nécessaires, ce que nous avons fait en vous interrogeant. 
Nous avons d'importants actifs que nous réalisons et nous permettent de réinvestir à certains moments selon les opportunités.
Mais c'est également une capacité à garantir des remboursements d'intérêts ou de capital.
Cordialement.
Joel JOANNY
_

Auteur : Membre de l'équipe Bricks
Message : [h1]1) Résumé du projet (≤10 lignes)[/h1]
[b]Marchand de biens[/b] – finalisation d'une [b]réhabilitation intérieure[/b] d'un immeuble détenu de longue date [b]place François-Ier, Cognac[/b] (« Les Salons de la Cité »). Programme : [b]7 appartements à créer/rénover[/b], + [b]23 places de parking intérieures[/b] + [b]1 local commercial[/b] à céder. [b]Pas d'achat[/b] (bien déjà acquis). [b]Capex travaux[/b] annoncés ~[b]0,96 M€ TTC[/b] (≈ [b]0,80 M€ HT[/b]). [b]Chiffre d'affaires de cession[/b] visé : [b]~2,0 M€ TTC[/b] (7 appartements) [b]+ ~0,45 M€ TTC[/b] (parkings + commerce) ≈ [b]2,45 M€ TTC[/b]. [b]Dette demandée : 750 k€[/b], [b]18 mois[/b]. [b]Apport annoncé : 150 k€[/b], avec [b]70 k€[/b] d'avance « fin août », solde à l'ouverture du chantier (mi-sept.). [b]Sortie[/b] : remboursement in fine via [b]prix de vente[/b] des lots.
[h1]2) Points forts[/h1]
[ml][ul][li indent=0 align=left][b]Actif déjà détenu[/b] en [b]adresse prime[/b] (place François-Ier) avec historique public du site « Salons de la Cité ». [url=https://www.charentelibre.fr/economie/travaux/salons-de-la-cite-a-cognac-defi-architectural-6263437.php?utm_source=chatgpt.com]CharenteLibre.fr+1[/url][/li][li indent=0 align=left][b]Capex encadré[/b] par devis d'un [b]gros groupe[/b] (Vilquin – Fayat), périmètre essentiellement intérieur (structure existante).[/li][li indent=0 align=left][b]Calendrier court[/b] (18 mois) typé Mdb, assorti d'un [b]pipeline de lots[/b] (7 appts + parkings + commerce) permettant un [b]encaissement progressif[/b].[/li][li indent=0 align=left][b]Potentiel de valorisation[/b] crédible au regard des prix/m² centre-ville (voir #4).[/li][/ul][/ml][h1]3) Risques &amp; incohérences[/h1]
[ml][ul][li indent=0 align=left][b]Preuve d'apport non fournie[/b] à ce stade ; libération [b]conditionnée[/b] à l'accord de financement : [b]à proscrire[/b] → [b]justificatif bancaire immédiat[/b] requis (même capture d'écran).[/li][li indent=0 align=left][b]Pièces financières incomplètes[/b] : [b]prévisionnel rapproché[/b] (planning/décaissements, prix/m² par lot, frais Mdb, taxes, intérêts), [b]plan de trésorerie mensuel[/b] et [b]waterfall[/b] de remboursement.[/li][li indent=0 align=left][b]Risque d'exécution travaux[/b] (multi-lots, coordination, finitions) et [b]risque liquidité[/b] (vitesse de commercialisation, saisonnalité locale).[/li][li indent=0 align=left][b]Urbanisme[/b] : PC initial 2012 « modifié » — [b]confirmer périmètre[/b], nécessité (ou non) de [b]DP[/b] complémentaires, [b]attestation d'absence de recours[/b] le cas échéant.[/li][li indent=0 align=left][b]KYC[/b] : le dirigeant [b]Joël JOANNY[/b] a un [b]passif de procédure collective[/b] (ancienne) et des entités radiées/fermées — [b]à documenter[/b] (attestations fiscales/sociales, [b]attestation de non-procédure en cours[/b]). [url=https://www.pappers.fr/dirigeant/joel_joanny_1954-04?utm_source=chatgpt.com]Pappers+2Pappers+2[/url][/li][/ul][/ml][h1]4) Challenge marché (achat &amp; sortie vs DVF + médiane)[/h1]
[ml][ul][li indent=0 align=left][b]Pas d'achat[/b] (actif détenu) → on challenge [b]les prix de sortie[/b]. Repères Cognac (août 2025, appartements) :[/li][ul data=1][li indent=1 align=left][b]Figaro Immo[/b] médian [b]~2 651 €/m²[/b] (bornes ~1 351–3 090). [url=https://immobilier.lefigaro.fr/prix-immobilier/cognac/ville-16102?utm_source=chatgpt.com]Figaro Immobilier[/url][/li][li indent=1 align=left][b]MeilleursAgents[/b] moyenne [b]~1 633 €/m²[/b] (≈ 922–2 859). [url=https://www.meilleursagents.com/prix-immobilier/cognac-16100/?utm_source=chatgpt.com]Meilleurs Agents[/url][/li][li indent=1 align=left][b]PAP[/b] [b]~1 802 €/m²[/b] ; [b]ParuVendu[/b] [b]~1 994 €/m²[/b] ; [b]RealAdvisor[/b] [b]~1 981 €/m²[/b] ; [b]Efficity[/b] ~[b]1 710 €/m²[/b]. [url=https://www.pap.fr/vendeur/prix-m2/cognac-16100-g12377?utm_source=chatgpt.com]PAP - Particulier à Particulier[/url][url=https://www.paruvendu.fr/immobilier/prix-m2/cognac-16100/?utm_source=chatgpt.com]ParuVendu[/url][url=https://realadvisor.fr/fr/prix-m2-immobilier/16100-cognac?utm_source=chatgpt.com]RealAdvisor[/url][url=https://www.efficity.com/prix-immobilier-m2/v_cognac_16100/?utm_source=chatgpt.com]efficity[/url][/li][li indent=1 align=left][b]DVF Etalab[/b] à exploiter pour [b]comparables récents[/b] centre-ville (place François-Ier). [url=https://app.dvf.etalab.gouv.fr/?utm_source=chatgpt.com]DVF[/url][url=https://www.immo-data.fr/dvf?utm_source=chatgpt.com]Immo Data[/url][/li][/ul][li indent=0 align=left][b]Sanity-check[/b] (estimation, en attendant les [b]surfaces par lot[/b]) : [b]2,0 M€[/b] sur 7 appts ⇒ si [b]700–800 m²[/b] habitables totaux, [b]prix de sortie[/b] implicite [b]~2 500–2 850 €/m²[/b] : [b]haut de fourchette[/b] locale mais [b]défendable[/b] pour du [b]rénové prime[/b] place François-Ier, à [b]documenter[/b] par comparables DVF/transactions récentes. [i](Hypothèse à valider sur surfaces précises et qualité de prestations.)[/i][/li][/ul][/ml][h1]5) KYC porteur[/h1]
[ml][ul][li indent=0 align=left][b]Aren-Art (SIREN 512 659 939)[/b] à Cognac (37 place François-Ier) — établissements [b]fermés[/b] ; autres structures liées ([b]SCCV de l'Alma[/b], etc.). [b]Dirigeant[/b] : [b]Joël Joanny[/b] (plusieurs sociétés ; [b]1 procédure collective passée[/b]). → [b]Collecter[/b] : K-bis de la [b]SPV porteuse[/b], [b]BE/UBO[/b], pièce d'identité, [b]attestations fiscales &amp; sociales[/b], [b]attestation sur l'honneur[/b] d'absence de procédure en cours/sûretés existantes sur l'actif, [b]état hypothécaire &lt; 3 mois[/b]. [url=https://www.pappers.fr/entreprise/aren-art-512659939?utm_source=chatgpt.com]Pappers+1[/url][/li][/ul][/ml][h1]6) Documents manquants / à mettre à jour[/h1]
[ml][ul][li indent=0 align=left][b]Preuve d'apport 150 k€[/b] (solde + [b]70 k€[/b] d'avance : [b]justificatifs bancaires datés[/b]).[/li][li indent=0 align=left][b]Titre de propriété[/b] + [b]état hypothécaire[/b] récent (et [b]état descriptif de division[/b] si existant).[/li][li indent=0 align=left][b]Prévisionnel rapproché Mdb[/b] (par lot) : surfaces, prix/m², calendrier de travaux &amp; ventes, [b]coûts complets[/b] (honoraires, DO, assurances, commercialisation, intérêts), [b]TVA/Mdb[/b] (TVA sur marge vs droit commun), [b]sensitivity[/b] (±5–10 % prix &amp; délais).[/li][li indent=0 align=left][b]Plan de trésorerie mensuel[/b] (18–24 mois) avec [b]réserve d'intérêts[/b] et [b]waterfall[/b] de remboursement (délégation notaire).[/li][li indent=0 align=left][b]Urbanisme[/b] : arrêté PC/arrêtés modificatifs, [b]nécessité de DP[/b] ?, attest. absence recours si pertinente, ERP/assurances DO si impacts structurels.[/li][li indent=0 align=left][b]Devis signés &amp; ventilés[/b] (7 lots, VRD, parties communes), [b]planning[/b] &amp; [b]jalons de tirage[/b] ; attestations [b]décennale[/b]/[b]RC[/b] entreprises.[/li][li indent=0 align=left][b]Tableau de comparables DVF[/b] (centre-ville, rénové/standing comparable) + [b]avis de valeur[/b] actualisé par agence locale.[/li][/ul][/ml][h1]7) Apport recommandé &amp; structure de garanties[/h1]
[ml][ul][li indent=0 align=left][b]Apport recommandé[/b] : [b]≥ 15–20 % du besoin total[/b] (Capex + frais + intérêts) → [b]150–200 k€[/b] [b]effectivement disponibles[/b] [b]avant[/b] tirage, vu l'incertitude sur flux.[/li][li indent=0 align=left][b]Dette[/b] : [b]750 k€[/b] max, [b]18 mois[/b], [b]tirages échelonnés[/b] sur jalons (DROC, cloisons, second œuvre, finitions).[/li][li indent=0 align=left][b]Garanties – priorité 1er rang[/b] :[/li][ul data=1][li indent=1 align=left][b]Hypothèque 1er rang[/b] sur l'ensemble de l'immeuble (puis [b]mainlevées partielles[/b] lot par lot conditionnées au [b]reversement prioritaire[/b] capital/ intérêts selon [b]waterfall[/b]).[/li][li indent=1 align=left][b]Délégation du prix de vente[/b] chez notaire (lots, parkings, local) + [b]blocage séquestre[/b] jusqu'au seuil de remboursement défini.[/li][li indent=1 align=left][b]Nantissement[/b] des comptes (réserve d'intérêts [b]6–9 mois[/b]), [b]cession Dailly[/b] sur créances de vente si applicable.[/li][li indent=1 align=left][b]Covenants[/b] : [b]min. de pré-commercialisation[/b] (ex. ≥ 30 % en promesses/compromis avant 1er tirage « second œuvre »), [b]plafond LTV[/b] intermédiaire, [b]reporting mensuel[/b] avancement &amp; commercialisation.[/li][li indent=1 align=left][b]Interdiction[/b] de toute mention « [b]garanti[/b] » (rendement/capital) dans la doc investisseurs.[/li][/ul][/ul][/ml][h1]8) Note du projet[/h1]
[b]Sécurité : 6/10.[/b]
 Adresse et actif de qualité, Capex maîtrisé, potentiel prix/m² [b]haut de fourchette[/b] mais plausible en prime. Le [b]verrou[/b] est [b]opérationnel/financier[/b] (preuve d'apport cash immédiate, trésorerie tampon, discipline de tirage) et [b]documentaire[/b] (prévisionnel par lot, urbanisme). Le passage comité est envisageable [b]si[/b] apport [b]prouvé[/b], [b]waterfall[/b] &amp; [b]sûretés[/b] actés, et [b]comparables DVF[/b] confirmant les prix de sortie.
_

Auteur : Membre de l'équipe Bricks
Message : Bonjour,
Merci pour le retour.
Avez-vous un Kbis de la société qui porte le financement svp ?
Pour le reste, je vais renvoyer le dossier en analyse mais le financement sera conditionné à un apport si accord.
Merci
Franck
_

Auteur : Porteur de projet
Message : Bonjour,

Ci-joint le Kbis de la Holding porteuse.
Cordialement.
Joel JOANNY
_

Auteur : Membre de l'équipe Bricks
Message : Bonjour,
Bien reçu merci.
Je transmets maintenant le dossier en analyse.
Je reviens vers vous une fois celle-ci effectuée dans les prochains jours.
Bonne journée,
Franck
_

Auteur : Membre de l'équipe Bricks
Message : Preuve d'apport fournie si accord de financement`,
  "fiche": `Présentation du projet par le porteur de projet :
Aménagement de 7 appartements dans un espace existant neuf dans les Salons de la Cité,  (bureaux, appartements de standing)
_
Présentation du porteur de projet par le porteur de projet :
SAS ARCADOM filiale de la SAS COLISEA
_
Présentation de la localisation par le porteur de projet :
Centre de la ville de Cognac (16100)à
_
Présentation de la structuration financière le porteur de projet :
Vente des appartements pour un total de 2M d'Euros dans un bâtiment que nous avons entièrement rénové pour un cout total d'environ 900 KE`
};

console.log('=== TEST 1: Conversion en JSON ===');
try {
  const jsonString = JSON.stringify(testData);
  console.log('✅ JSON.stringify réussi');
  console.log('Taille du JSON:', jsonString.length, 'caractères');
  
  // Chercher les caractères problématiques
  const controlChars = jsonString.match(/[\x00-\x1F\x7F]/g);
  if (controlChars) {
    console.log('❌ Caractères de contrôle trouvés:', controlChars.length);
    console.log('Premiers caractères:', controlChars.slice(0, 10));
  } else {
    console.log('✅ Aucun caractère de contrôle trouvé');
  }
} catch (error) {
  console.error('❌ Erreur JSON.stringify:', error.message);
}

console.log('\n=== TEST 2: Simulation body-parser ===');
try {
  const jsonString = JSON.stringify(testData);
  const parsed = JSON.parse(jsonString);
  console.log('✅ body-parser simulation réussie');
} catch (error) {
  console.error('❌ Erreur body-parser simulation:', error.message);
  console.error('Position:', error.message.match(/position (\d+)/)?.[1]);
}

console.log('\n=== TEST 3: Nettoyage des caractères ===');
try {
  let jsonString = JSON.stringify(testData);
  
  // Nettoyer comme dans notre middleware
  jsonString = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
  
  const parsed = JSON.parse(jsonString);
  console.log('✅ Nettoyage et parsing réussis');
} catch (error) {
  console.error('❌ Erreur après nettoyage:', error.message);
}

console.log('\n=== TEST 4: Analyse du champ conversations ===');
const conversations = testData.conversations;
console.log('Longueur conversations:', conversations.length);

// Chercher les caractères problématiques dans conversations
const problematicChars = [];
for (let i = 0; i < conversations.length; i++) {
  const char = conversations[i];
  const code = char.charCodeAt(0);
  if (code >= 0 && code <= 31 && code !== 9 && code !== 10 && code !== 13) {
    problematicChars.push({ char, code, position: i });
  }
}

if (problematicChars.length > 0) {
  console.log('❌ Caractères problématiques dans conversations:');
  problematicChars.slice(0, 10).forEach(({ char, code, position }) => {
    console.log(`  Position ${position}: code ${code} (${char.charCodeAt(0).toString(16)})`);
  });
} else {
  console.log('✅ Aucun caractère problématique dans conversations');
}
