"use client";

export type Language = "nl" | "en";

export const DEFAULT_LANGUAGE: Language = "nl";
export const LANGUAGE_EVENT = "language-changed";

export function readStoredLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem("schools_language");
  return stored === "en" || stored === "nl" ? stored : DEFAULT_LANGUAGE;
}

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
    "dashboard.upcoming": "Aankomende open dagen",
    "dashboard.no_upcoming": "Geen open dagen gevonden.",
    "dashboard.view_all": "Bekijk alle open dagen",
    "dashboard.progress_title": "Voortgang",
    "dashboard.progress_complete": "compleet",
    "dashboard.tip_profile": "Maak je profiel compleet om te starten.",
    "dashboard.tip_invite": "Nodig een familielid uit om samen te plannen.",
    "dashboard.tip_shortlist": "Voeg je eerste school toe aan de shortlist.",
    "dashboard.tip_note": "Voeg een eerste notitie toe aan een school.",
    "dashboard.tip_rating": "Geef een eerste beoordeling aan een school.",
    "dashboard.tip_attended": "Markeer een bezoek.",
    "dashboard.tip_done": "Alles staat op groen. Goed bezig!",
    "dashboard.tip_cta_settings": "Ga naar instellingen",
    "dashboard.tip_cta_schools": "Ga naar scholen",
    "dashboard.tip_cta_open_days": "Ga naar open dagen",
    "dashboard.tip":
      "Tip: na het inloggen kun je scholen bekijken, notities maken, een Top 12 ranglijst bouwen en open dagen zien.",
    "dashboard.signin_body":
      "Log in met een e‑mail van een familielid. Je blijft ingelogd op dit apparaat.",

    "setup.title": "Welkom",
    "setup.intro": "Laten we het even instellen. Dit duurt ongeveer een minuut.",
    "setup.finish": "Setup afronden",
    "setup.next": "Volgende",
    "setup.saving": "Opslaan...",
    "setup.thanks": "Bedankt",
    "setup.go_dashboard": "Ga naar Dashboard",
    "setup.signout": "Uitloggen",
    "setup.required_title": "Setup vereist",
    "setup.required_body":
      "Alleen de eigenaar kan de setup afronden. Vraag de eigenaar om het profiel af te maken.",
    "setup.invite_intro": "Wil je samen plannen? Nodig een familielid uit.",
    "setup.invite_shared":
      "Familieleden zien dezelfde scholen, shortlist en open dagen. Notities zijn per persoon en voor iedereen zichtbaar.",
    "setup.invite_label": "E-mailadres familielid",
    "setup.invite_send": "Stuur uitnodiging",
    "setup.invite_sending": "Versturen...",
    "setup.invite_invalid": "Vul een geldig e-mailadres in.",
    "setup.invite_auth_required": "Je moet ingelogd zijn om een uitnodiging te sturen.",
    "setup.invite_failed": "Uitnodiging mislukt.",
    "setup.invite_already_sent": "Uitnodiging is al verstuurd.",
    "setup.invite_sent": "Uitnodiging verstuurd.",
    "setup.invite_later": "Je kunt later ook familie toevoegen via Instellingen.",
    "setup.skip": "Nu overslaan",
    "setup.continue": "Doorgaan",

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
    "menu.feedback": "Feedback",
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

    "feedback.title": "Feedback",
    "feedback.subtitle": "Deel bugs, ideeën of vragen. We lezen alles.",
    "feedback.category": "Categorie",
    "feedback.category_bug": "Bug",
    "feedback.category_idea": "Idee",
    "feedback.category_question": "Vraag",
    "feedback.category_other": "Anders",
    "feedback.title_label": "Titel (optioneel)",
    "feedback.message_label": "Bericht",
    "feedback.send": "Verstuur feedback",
    "feedback.sending": "Versturen...",
    "feedback.empty": "Nog geen feedback.",
    "feedback.your": "Jouw feedback",
    "feedback.response": "Reactie",
    "feedback.new_response": "Nieuwe reactie",
    "feedback.thanks": "Bedankt! We kijken ernaar.",
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
    "dashboard.upcoming": "Upcoming open days",
    "dashboard.no_upcoming": "No upcoming open days found.",
    "dashboard.view_all": "View all open days",
    "dashboard.progress_title": "Progress",
    "dashboard.progress_complete": "complete",
    "dashboard.tip_profile": "Complete your profile to get started.",
    "dashboard.tip_invite": "Invite a family member to plan together.",
    "dashboard.tip_shortlist": "Add your first school to the shortlist.",
    "dashboard.tip_note": "Add your first note to a school.",
    "dashboard.tip_rating": "Add your first rating to a school.",
    "dashboard.tip_attended": "Mark a visit.",
    "dashboard.tip_done": "You’re all set. Nice work!",
    "dashboard.tip_cta_settings": "Go to settings",
    "dashboard.tip_cta_schools": "Go to schools",
    "dashboard.tip_cta_open_days": "Go to open days",
    "dashboard.tip":
      "Tip: once signed in, you’ll be able to browse schools, save visit notes, build a ranked Top 12, and see open days.",
    "dashboard.signin_body":
      "Sign in with a family member email. The app stays signed in on this device.",

    "setup.title": "Welcome",
    "setup.intro": "Let’s set things up. It takes about a minute.",
    "setup.finish": "Finish setup",
    "setup.next": "Next",
    "setup.saving": "Saving...",
    "setup.thanks": "Thanks",
    "setup.go_dashboard": "Go to Dashboard",
    "setup.signout": "Sign out",
    "setup.required_title": "Setup required",
    "setup.required_body": "Only the workspace owner can complete setup. Ask them to finish the profile.",
    "setup.invite_intro": "Plan together? Invite a family member.",
    "setup.invite_shared":
      "Family members share the same schools, shortlist, and open days. Notes are per person and visible to everyone.",
    "setup.invite_label": "Family member email",
    "setup.invite_send": "Send invite",
    "setup.invite_sending": "Sending...",
    "setup.invite_invalid": "Enter a valid email address.",
    "setup.invite_auth_required": "You must be signed in to send an invite.",
    "setup.invite_failed": "Invite failed.",
    "setup.invite_already_sent": "Invite already sent.",
    "setup.invite_sent": "Invite sent.",
    "setup.invite_later": "You can add family later from Settings.",
    "setup.skip": "Skip for now",
    "setup.continue": "Continue",

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
    "menu.feedback": "Feedback",
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

    "feedback.title": "Feedback",
    "feedback.subtitle": "Share bugs, ideas, or questions. We read everything.",
    "feedback.category": "Category",
    "feedback.category_bug": "Bug",
    "feedback.category_idea": "Idea",
    "feedback.category_question": "Question",
    "feedback.category_other": "Other",
    "feedback.title_label": "Title (optional)",
    "feedback.message_label": "Message",
    "feedback.send": "Send feedback",
    "feedback.sending": "Sending...",
    "feedback.empty": "No feedback yet.",
    "feedback.your": "Your feedback",
    "feedback.response": "Response",
    "feedback.new_response": "New response",
    "feedback.thanks": "Thanks! We’ll take a look.",
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
