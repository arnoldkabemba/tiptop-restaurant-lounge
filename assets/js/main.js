/* ==========================================================================
   TIPTOP Restaurant & Lounge — scripts
   Aucune dépendance externe.
   ========================================================================== */
(function () {
  'use strict';

  /* ---- Horaires (source unique de vérité) --------------------------------
     Index 0 = dimanche, conforme à Date.getDay().
     Les créneaux qui franchissent minuit sont notés en minutes au-delà
     de 1440 (ex. 02:00 du lendemain = 1560).                               */
  var HORAIRES = [
    { jour: 'dimanche', ouv: 12 * 60, fer: 25 * 60, libelle: '12h00 – 01h00' },
    { jour: 'lundi',    ouv: 12 * 60, fer: 24 * 60, libelle: '12h00 – 00h00' },
    { jour: 'mardi',    ouv: 12 * 60, fer: 24 * 60, libelle: '12h00 – 00h00' },
    { jour: 'mercredi', ouv: 12 * 60, fer: 24 * 60, libelle: '12h00 – 00h00' },
    { jour: 'jeudi',    ouv: 12 * 60, fer: 25 * 60, libelle: '12h00 – 01h00' },
    { jour: 'vendredi', ouv: 12 * 60, fer: 26 * 60, libelle: '12h00 – 02h00' },
    { jour: 'samedi',   ouv: 12 * 60, fer: 26 * 60, libelle: '12h00 – 02h00' }
  ];

  /* Heure locale de Lubumbashi (UTC+2, pas de changement d'heure) */
  function maintenantLubumbashi() {
    var d = new Date();
    var utc = d.getTime() + d.getTimezoneOffset() * 60000;
    return new Date(utc + 2 * 3600000);
  }

  function deuxChiffres(n) { return (n < 10 ? '0' : '') + n; }

  function etatOuverture() {
    var d = maintenantLubumbashi();
    var jour = d.getDay();
    var min = d.getHours() * 60 + d.getMinutes();

    // Créneau entamé la veille et encore en cours après minuit
    var veille = HORAIRES[(jour + 6) % 7];
    if (veille.fer > 1440 && min < veille.fer - 1440) {
      return { ouvert: true, ferme: veille.fer - 1440, jourIndex: jour };
    }
    var auj = HORAIRES[jour];
    if (min >= auj.ouv && min < Math.min(auj.fer, 1440)) {
      return { ouvert: true, ferme: auj.fer, jourIndex: jour };
    }
    // Prochaine ouverture
    var decalage = min < auj.ouv ? 0 : 1;
    var prochain = HORAIRES[(jour + decalage) % 7];
    return {
      ouvert: false,
      ouvreA: prochain.ouv,
      quand: decalage === 0 ? "aujourd’hui" : 'demain',
      jourIndex: jour
    };
  }

  function formatHeure(minutes) {
    var m = minutes % 1440;
    return deuxChiffres(Math.floor(m / 60)) + 'h' + deuxChiffres(m % 60);
  }

  /* Bandeau « ouvert / fermé » en temps réel */
  function majEtat() {
    var zone = document.querySelector('[data-etat]');
    var e = etatOuverture();

    if (zone) {
      var pastille = zone.querySelector('.pastille');
      var txt = zone.querySelector('[data-etat-texte]');
      if (pastille) pastille.classList.toggle('pastille--ferme', !e.ouvert);
      if (txt) {
        txt.innerHTML = e.ouvert
          ? 'Ouvert maintenant <span class="detail">· jusqu’à ' + formatHeure(e.ferme) + '</span>'
          : 'Fermé <span class="detail">· ouvre ' + e.quand + ' à ' + formatHeure(e.ouvreA) + '</span>';
      }
    }

    // Surligne la ligne du jour. data-jour accepte plusieurs jours
    // ("1 2 3"), pour les tableaux condensés du type « Lun – Mer ».
    document.querySelectorAll('.horaires tr[data-jour]').forEach(function (tr) {
      var jours = tr.dataset.jour.split(/\s+/).map(Number);
      tr.classList.toggle('aujourdhui', jours.indexOf(e.jourIndex) !== -1);
    });
  }

  /* ---- Navigation mobile ------------------------------------------------ */
  function navMobile() {
    var burger = document.querySelector('.burger');
    var voile = document.querySelector('.voile');
    if (!burger) return;

    function basculer(force) {
      var ouvert = force !== undefined ? force : !document.body.classList.contains('nav-ouverte');
      document.body.classList.toggle('nav-ouverte', ouvert);
      burger.setAttribute('aria-expanded', String(ouvert));
    }

    burger.addEventListener('click', function () { basculer(); });
    if (voile) voile.addEventListener('click', function () { basculer(false); });
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () { basculer(false); });
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') basculer(false);
    });
  }

  /* ---- En-tête collé ---------------------------------------------------- */
  function enteteCollee() {
    var entete = document.querySelector('.entete');
    if (!entete) return;
    var tick = false;

    function majEntete() {
      entete.classList.toggle('entete--collee', window.scrollY > 60);
    }

    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () { majEntete(); tick = false; });
    }, { passive: true });

    // Au chargement : une page ouverte sur une ancre démarre déjà défilée,
    // l'en-tête doit alors être opaque dès le premier affichage.
    majEntete();
  }

  /* ---- Apparitions au défilement ---------------------------------------- */
  function revelations() {
    var cibles = document.querySelectorAll('.reveal, .devoile, .cascade');
    if (!cibles.length) return;
    if (!('IntersectionObserver' in window)) {
      cibles.forEach(function (el) { el.classList.add('vu'); });
      return;
    }
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('vu');
          obs.unobserve(e.target);
        }
      });
      // Seuil à 0 : un conteneur plus haut que l'écran (la galerie fait
      // plusieurs milliers de pixels) n'atteindrait jamais un seuil en
      // pourcentage et resterait invisible. La marge basse retarde
      // l'apparition juste ce qu'il faut.
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    cibles.forEach(function (el) { obs.observe(el); });
  }

  /* ---- Carrousel du héros ------------------------------------------------ */
  var DUREE_VUE = 6000;

  function carrousel() {
    var zone = document.querySelector('[data-carrousel]');
    if (!zone) return;
    var vues = Array.prototype.slice.call(zone.querySelectorAll('.heros__vue'));
    if (vues.length < 2) return;

    var points = document.querySelector('.heros__points');
    var index = 0;
    var minuteur = null;
    var sobre = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Seule la première photo est dans le HTML avec son `src`. Les autres
       attendent que la page soit affichée pour se charger : la première
       image arrive ainsi beaucoup plus vite sur une connexion lente. */
    function chargerLesSuivantes() {
      zone.querySelectorAll('img[data-src]').forEach(function (img) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    }
    if (document.readyState === 'complete') chargerLesSuivantes();
    else window.addEventListener('load', chargerLesSuivantes);

    // Puces de navigation, construites depuis les vues
    var boutons = [];
    if (points) {
      points.style.setProperty('--duree-vue', DUREE_VUE + 'ms');
      vues.forEach(function (v, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-label', 'Photo ' + (i + 1) + ' sur ' + vues.length);
        b.setAttribute('aria-selected', String(i === 0));
        b.addEventListener('click', function () { aller(i, true); });
        points.appendChild(b);
        boutons.push(b);
      });
    }

    function aller(i, manuel) {
      index = (i + vues.length) % vues.length;
      vues.forEach(function (v, n) { v.classList.toggle('est-active', n === index); });
      boutons.forEach(function (b, n) {
        // Retirer puis remettre l'attribut relance l'animation de la puce
        b.setAttribute('aria-selected', 'false');
        if (n === index) {
          void b.offsetWidth;
          b.setAttribute('aria-selected', 'true');
        }
      });
      if (manuel) relancer();
    }

    function relancer() {
      clearInterval(minuteur);
      if (sobre) return;
      minuteur = setInterval(function () { aller(index + 1); }, DUREE_VUE);
    }

    // On met l'animation en pause quand l'onglet n'est pas regardé
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearInterval(minuteur); else relancer();
    });

    aller(0);
    relancer();
  }

  /* ---- Machine à écrire -------------------------------------------------- */
  function machineAEcrire() {
    var zone = document.querySelector('[data-machine]');
    if (!zone) return;

    var phrases = (zone.dataset.machine || '').split('|').map(function (s) { return s.trim(); })
      .filter(Boolean);
    if (!phrases.length) return;

    // Version lisible par les lecteurs d'écran, hors animation
    var lu = document.createElement('span');
    lu.className = 'sr';
    lu.textContent = phrases.join(', ');
    zone.parentNode.insertBefore(lu, zone.nextSibling);
    zone.setAttribute('aria-hidden', 'true');

    var texte = document.createElement('span');
    var curseur = document.createElement('span');
    curseur.className = 'machine__curseur';
    zone.textContent = '';
    zone.append(texte, curseur);

    /* On réserve d'avance la hauteur de la phrase la plus haute : sur un
       écran étroit certaines passent sur deux lignes, et sans cela toute
       la page sauterait au rythme de la frappe. */
    function reserverHauteur() {
      zone.style.minHeight = '';
      var plusHaut = 0;
      phrases.forEach(function (p) {
        texte.textContent = p;
        plusHaut = Math.max(plusHaut, zone.offsetHeight);
      });
      texte.textContent = '';
      zone.style.minHeight = plusHaut + 'px';
    }

    reserverHauteur();

    var attente;
    window.addEventListener('resize', function () {
      clearTimeout(attente);
      attente = setTimeout(reserverHauteur, 200);
    });

    // Sans animation : on affiche simplement la première phrase
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      texte.textContent = phrases[0];
      return;
    }

    var p = 0, c = 0, efface = false;

    function battre() {
      var phrase = phrases[p];
      texte.textContent = phrase.slice(0, c);

      var pause;
      if (!efface) {
        c++;
        pause = 58 + Math.random() * 52;          // frappe irrégulière, comme une main
        if (c > phrase.length) {
          efface = true;
          pause = 2100;                            // on laisse lire
          zone.classList.add('machine--fini');
        }
      } else {
        c--;
        pause = 28;                                // l'effacement est plus rapide
        if (c === 0) {
          efface = false;
          p = (p + 1) % phrases.length;
          pause = 320;
          zone.classList.remove('machine--fini');
        }
      }
      setTimeout(battre, pause);
    }

    setTimeout(battre, 700);
  }

  /* ---- Compteurs --------------------------------------------------------- */
  function compteurs() {
    var cibles = document.querySelectorAll('[data-compteur]');
    if (!cibles.length || !('IntersectionObserver' in window)) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        animer(e.target);
      });
    }, { threshold: 0.6 });

    function animer(el) {
      var fin = parseFloat(el.dataset.compteur.replace(',', '.'));
      var decimales = (el.dataset.compteur.split(',')[1] || '').length;
      var suffixe = el.dataset.suffixe || '';
      var depart = performance.now();
      var duree = 1300;

      function pas(t) {
        var k = Math.min((t - depart) / duree, 1);
        var adouci = 1 - Math.pow(1 - k, 3);
        var v = (fin * adouci).toFixed(decimales).replace('.', ',');
        el.textContent = (decimales === 0 && suffixe === 'h' ? ('0' + v).slice(-2) : v) + suffixe;
        if (k < 1) requestAnimationFrame(pas);
      }
      requestAnimationFrame(pas);
    }

    cibles.forEach(function (el) { obs.observe(el); });
  }

  /* ---- Sommaire de la carte (scrollspy) --------------------------------- */
  function sommaireCarte() {
    var liens = document.querySelectorAll('.menu-nav a');
    if (!liens.length) return;
    var sections = [];
    liens.forEach(function (a) {
      var s = document.querySelector(a.getAttribute('href'));
      if (s) sections.push({ lien: a, section: s });
    });
    if (!sections.length) return;

    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        liens.forEach(function (a) { a.classList.remove('actif'); });
        var trouve = sections.filter(function (x) { return x.section === e.target; })[0];
        if (trouve) trouve.lien.classList.add('actif');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (x) { obs.observe(x.section); });
  }

  /* ---- Galerie : filtres + visionneuse ---------------------------------- */
  function galerie() {
    var grille = document.querySelector('.galerie-grille');
    var figures = grille ? Array.prototype.slice.call(grille.querySelectorAll('figure')) : [];

    // Filtres
    var filtres = document.querySelectorAll('.galerie-filtres button');
    filtres.forEach(function (b) {
      b.addEventListener('click', function () {
        var cat = b.dataset.filtre;
        filtres.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        figures.forEach(function (f) {
          f.hidden = cat !== 'tout' && f.dataset.cat !== cat;
        });
      });
    });

    // Visionneuse (galerie + mosaïque de l'accueil)
    var vue = document.querySelector('.visionneuse');
    if (!vue) return;
    var img = vue.querySelector('img');
    var cpt = vue.querySelector('.visionneuse__cpt');
    var sources = [];
    var index = 0;

    function collecter() {
      sources = [];
      figures.forEach(function (f) {
        if (!f.hidden) {
          var i = f.querySelector('img');
          if (i) sources.push({ src: i.dataset.grand || i.src, alt: i.alt });
        }
      });
    }

    function afficher(i) {
      if (!sources.length) return;
      index = (i + sources.length) % sources.length;
      img.src = sources[index].src;
      img.alt = sources[index].alt;
      if (cpt) cpt.textContent = (index + 1) + ' / ' + sources.length;
    }

    function ouvrir(i) {
      collecter();
      afficher(i);
      vue.classList.add('actif');
      document.body.style.overflow = 'hidden';
    }

    function fermer() {
      vue.classList.remove('actif');
      document.body.style.overflow = '';
    }

    figures.forEach(function (f, i) {
      f.addEventListener('click', function () {
        collecter();
        var visibles = figures.filter(function (x) { return !x.hidden; });
        ouvrir(visibles.indexOf(f));
      });
    });

    vue.querySelector('.visionneuse__fermer').addEventListener('click', fermer);
    vue.querySelector('.visionneuse__prec').addEventListener('click', function () { afficher(index - 1); });
    vue.querySelector('.visionneuse__suiv').addEventListener('click', function () { afficher(index + 1); });
    vue.addEventListener('click', function (e) { if (e.target === vue) fermer(); });
    document.addEventListener('keydown', function (e) {
      if (!vue.classList.contains('actif')) return;
      if (e.key === 'Escape') fermer();
      if (e.key === 'ArrowLeft') afficher(index - 1);
      if (e.key === 'ArrowRight') afficher(index + 1);
    });
  }

  /* ---- Formulaires : départ vers WhatsApp ------------------------------- */
  /* Pas de serveur à héberger : la demande part sur le WhatsApp du
     restaurant, pré-remplie. Un back-end pourra remplacer ce comportement. */
  function formulaires() {
    document.querySelectorAll('form[data-whatsapp]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = new FormData(f);
        var lignes = [f.dataset.objet || 'Demande depuis le site TIPTOP', ''];
        f.querySelectorAll('[name]').forEach(function (champ) {
          var v = (d.get(champ.name) || '').toString().trim();
          if (!v) return;
          var lab = f.querySelector('label[for="' + champ.id + '"]');
          lignes.push((lab ? lab.textContent.trim() : champ.name) + ' : ' + v);
        });
        var url = 'https://wa.me/' + f.dataset.whatsapp + '?text=' + encodeURIComponent(lignes.join('\n'));
        window.open(url, '_blank', 'noopener');
        var msg = f.querySelector('.formulaire__msg');
        if (msg) {
          msg.classList.add('actif');
          msg.focus && msg.focus();
        }
        f.reset();
      });
    });
  }

  /* ---- Année courante dans le pied de page ------------------------------ */
  function annee() {
    document.querySelectorAll('[data-annee]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ---- Démarrage -------------------------------------------------------- */
  function init() {
    majEtat();
    setInterval(majEtat, 60000);
    navMobile();
    enteteCollee();
    revelations();
    carrousel();
    machineAEcrire();
    compteurs();
    sommaireCarte();
    galerie();
    formulaires();
    annee();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
