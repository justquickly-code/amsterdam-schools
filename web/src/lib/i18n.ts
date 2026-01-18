"use client";

export type Language = "nl" | "en";

export const DEFAULT_LANGUAGE: Language = "nl";
export const LANGUAGE_EVENT = "language-changed";

const STRINGS: Record<Language, Record<string, string>> = {
  nl: {
    "login.title": "Inloggen",
    "login.subtitle": "Gebruik een e‑mail van een familielid. Je blijft ingelogd op dit apparaat.",
    "login.use_last": "Gebruik laatste e‑mail",
    "login.email": "E‑mail",
    "login.send_link": "Stuur inloglink",
    "login.sending": "Verzenden...",
    "login.sent": "Check je e‑mail voor de link.",
    "login.invalid_email": "Vul een geldig e‑mailadres in.",
    "login.sign_in": "Ga naar inloggen",

    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Welkom",
    "dashboard.finish_setup": "Maak de setup af",
    "dashboard.finish_setup_body":
      "Vul de naam van het kind, het adres en het advies in om filters en reistijd te personaliseren.",
    "dashboard.finish_setup_cta": "Ga naar instellingen",
    "dashboard.upcoming": "Aankomende open dagen (volgende 30 dagen)",
    "dashboard.no_upcoming": "Geen open dagen gevonden.",
    "dashboard.view_all": "Bekijk alle open dagen",
    "dashboard.shortlist_title": "Shortlist",
    "dashboard.shortlist_body": "Houd je Top 12 actueel terwijl je scholen bezoekt.",
    "dashboard.shortlist_cta": "Open Top 12",
    "dashboard.tip":
      "Tip: na het inloggen kun je scholen bekijken, notities maken, een Top 12 ranglijst bouwen en open dagen zien.",
    "dashboard.signin_body":
      "Log in met een e‑mail van een familielid. Je blijft ingelogd op dit apparaat.",

    "setup.title": "Welkom",
    "setup.intro": "Laten we het even instellen. Dit duurt ongeveer een minuut.",
    "setup.finish": "Setup afronden",
    "setup.saving": "Opslaan...",
    "setup.thanks": "Bedankt",
    "setup.go_dashboard": "Ga naar Dashboard",
    "setup.signout": "Uitloggen",
    "setup.required_title": "Setup vereist",
    "setup.required_body":
      "Alleen de eigenaar kan de setup afronden. Vraag de eigenaar om het profiel af te maken.",

    "settings.title": "Instellingen",
    "settings.edit": "Instellingen bewerken",
    "settings.child_name": "Naam kind",
    "settings.postcode": "Postcode",
    "settings.house_number": "Huisnummer",
    "settings.advies1": "Advies",
    "settings.advies2": "Advies (optioneel)",
    "settings.advies_select": "Kies advies",
    "settings.both_levels": "Toon alleen scholen die BEIDE niveaus aanbieden",
    "settings.save": "Opslaan",
    "settings.saving": "Opslaan...",
    "settings.language": "Taal",
    "settings.lang_nl": "Nederlands",
    "settings.lang_en": "English",

    "menu.settings": "Instellingen",
    "menu.print": "Print / Export",
    "menu.admin": "Admin",
    "menu.signout": "Uitloggen",

    "nav.dashboard": "Dashboard",
    "nav.schools": "Scholen",
    "nav.open_days": "Open dagen",
    "nav.shortlist": "Shortlist",

    "schools.title": "Scholen",
    "schools.search": "Zoek scholen…",
    "schools.sort": "Sorteren",
    "schools.sort_name": "Naam",
    "schools.sort_bike": "Fietstijd",

    "open_days.title": "Open dagen",
    "open_days.important": "Belangrijk",
    "open_days.important_body":
      "Details kunnen veranderen. Controleer altijd de schoolwebsite voordat je gaat.",
    "open_days.shortlist_only": "Alleen shortlist",
    "open_days.show_inactive": "Toon inactief",
    "open_days.event_type": "Type",
    "open_days.when": "Wanneer",
    "open_days.all_dates": "Alle data",
    "open_days.next7": "Volgende 7 dagen",
    "open_days.next14": "Volgende 14 dagen",

    "shortlist.title": "Top 12",
    "shortlist.subtitle": "Houd je lijst scherp: rangschik 1–12.",
    "shortlist.empty_slot": "Leeg",
    "shortlist.empty_list": "Je hebt nog geen scholen in de Top 12.",
    "shortlist.save": "Opslaan",
    "shortlist.saved": "Opgeslagen.",
    "shortlist.rank": "Rang",
    "shortlist.remove": "Verwijder",
    "shortlist.footer": "Volgende stap: voeg scholen toe via de scholenlijst of detailpagina.",
  },
  en: {
    "login.title": "Sign in",
    "login.subtitle": "Use a family member email. The app stays signed in on this device.",
    "login.use_last": "Use last email",
    "login.email": "Email",
    "login.send_link": "Send sign-in link",
    "login.sending": "Sending...",
    "login.sent": "Check your email for the sign-in link.",
    "login.invalid_email": "Please enter a valid email address.",
    "login.sign_in": "Go to sign in",

    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Welcome",
    "dashboard.finish_setup": "Finish setup",
    "dashboard.finish_setup_body":
      "Add the child’s name, home address, and advies level to personalize filters and commute times.",
    "dashboard.finish_setup_cta": "Go to settings",
    "dashboard.upcoming": "Upcoming open days (next 30 days)",
    "dashboard.no_upcoming": "No upcoming open days found.",
    "dashboard.view_all": "View all open days",
    "dashboard.shortlist_title": "Shortlist",
    "dashboard.shortlist_body": "Keep your ranked Top 12 up to date as you visit schools.",
    "dashboard.shortlist_cta": "Open Top 12",
    "dashboard.tip":
      "Tip: once signed in, you’ll be able to browse schools, save visit notes, build a ranked Top 12, and see open days.",
    "dashboard.signin_body":
      "Sign in with a family member email. The app stays signed in on this device.",

    "setup.title": "Welcome",
    "setup.intro": "Let’s set things up. It takes about a minute.",
    "setup.finish": "Finish setup",
    "setup.saving": "Saving...",
    "setup.thanks": "Thanks",
    "setup.go_dashboard": "Go to Dashboard",
    "setup.signout": "Sign out",
    "setup.required_title": "Setup required",
    "setup.required_body": "Only the workspace owner can complete setup. Ask them to finish the profile.",

    "settings.title": "Settings",
    "settings.edit": "Edit settings",
    "settings.child_name": "Child name",
    "settings.postcode": "Postcode",
    "settings.house_number": "House number",
    "settings.advies1": "Advice",
    "settings.advies2": "Advice (optional)",
    "settings.advies_select": "Choose advice",
    "settings.both_levels": "Only show schools that offer BOTH levels",
    "settings.save": "Save",
    "settings.saving": "Saving...",
    "settings.language": "Language",
    "settings.lang_nl": "Dutch",
    "settings.lang_en": "English",

    "menu.settings": "Settings",
    "menu.print": "Print / Export",
    "menu.admin": "Admin",
    "menu.signout": "Sign out",

    "nav.dashboard": "Dashboard",
    "nav.schools": "Schools",
    "nav.open_days": "Open days",
    "nav.shortlist": "Shortlist",

    "schools.title": "Schools",
    "schools.search": "Search schools…",
    "schools.sort": "Sort",
    "schools.sort_name": "Name",
    "schools.sort_bike": "Bike time",

    "open_days.title": "Open days",
    "open_days.important": "Important",
    "open_days.important_body":
      "Open day details can change. Always verify on the school website before you go.",
    "open_days.shortlist_only": "Shortlist only",
    "open_days.show_inactive": "Show inactive",
    "open_days.event_type": "Event type",
    "open_days.when": "When",
    "open_days.all_dates": "All dates",
    "open_days.next7": "Next 7 days",
    "open_days.next14": "Next 14 days",

    "shortlist.title": "Top 12",
    "shortlist.subtitle": "Keep your list sharp: rank 1–12.",
    "shortlist.empty_slot": "Empty",
    "shortlist.empty_list": "You don’t have any schools in your Top 12 yet.",
    "shortlist.save": "Save",
    "shortlist.saved": "Saved.",
    "shortlist.rank": "Rank",
    "shortlist.remove": "Remove",
    "shortlist.footer": "Next: add schools from the Schools list or School detail.",
  },
};

export function t(lang: Language, key: string) {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
}

export function getLocale(lang: Language) {
  return lang === "nl" ? "nl-NL" : "en-GB";
}

export function emitLanguageChanged(lang: Language) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: lang }));
}
