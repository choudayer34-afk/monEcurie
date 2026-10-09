// Soins des chevaux : types, périodicité et calcul de la prochaine échéance.
import { jour, enChaine } from "./prevision.js";

export const TYPES = {
  vaccin: { nom: "Vaccin", n: 12, unite: "mois" },
  vermifuge: { nom: "Vermifuge", n: 3, unite: "mois" },
  dentiste: { nom: "Dentiste", n: 12, unite: "mois" },
  ferrure: { nom: "Ferrure", n: 8, unite: "sem" },
  antiparasitaire: { nom: "Antiparasitaire", n: 1, unite: "mois" },
  autre: { nom: "Autre soin", n: 1, unite: "once" }
};
// Soins réservés à certaines espèces (tous les autres concernent tous les animaux)
export const ESPECES_SOIN = { ferrure: ["cheval"], dentiste: ["cheval"] };
export const soinPourEspece = (type, espece) => !ESPECES_SOIN[type] || ESPECES_SOIN[type].includes(espece || "cheval");
export const ponctuel = s => s.unite === "once";

export const libelleSoin = s => (TYPES[s.type]?.nom || "Soin") + (s.libelle ? " · " + s.libelle : "");

export function ajouter(date, n, unite) {
  if (unite === "sem") return enChaine(jour(date) + 7 * n);
  const y = +date.slice(0, 4), m = +date.slice(5, 7) - 1, d = +date.slice(8, 10);
  const cible = new Date(Date.UTC(y, m + n, 1));
  const dernierJour = new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)).getUTCDate();
  cible.setUTCDate(Math.min(d, dernierJour));
  return cible.toISOString().slice(0, 10);
}

// Prochaine échéance : dernier passage + périodicité, sinon la date de première échéance saisie
export function echeance(s) {
  if (ponctuel(s)) return s.dernier ? null : s.premiere || null; // soin ponctuel : plus d'échéance une fois fait
  if (s.dernier) return ajouter(s.dernier, +s.n || 1, s.unite || "mois");
  return s.premiere || null;
}

// Date retenue : le rendez-vous pris s'il existe (et n'est pas déjà réglé par un passage noté), sinon l'échéance calculée
export const rdvActif = s => !!(s.rdv && !(s.dernier && s.dernier >= s.rdv));
export const prochaine = s => (rdvActif(s) && !(ponctuel(s) && s.dernier) ? s.rdv : echeance(s));

export const joursAvant = (ech, auj) => (ech ? jour(ech) - auj : null);
