import { isDisposableDomain } from "./disposable-domains.js";
import { getEmailSuggestion } from "./email-typos.js";

export const CONSENT_TEXT = "Estas pessoas aceitaram receber os meus emails";

export const DROP_REASONS = {
	invalid: "endereço inválido",
	typo: "domínio mal escrito (gmial.com…)",
	trap: "endereço armadilha de spam",
	role: "endereço genérico (info@, support@…)",
	disposable: "caixa de correio descartável",
	duplicate: "duplicado no ficheiro",
	suppressed: "cancelou, foi devolvido ou denunciou antes",
	undeliverable: "não entregável",
	noMail: "o domínio não recebe email",
};

// Addresses that say what they are: published on web pages to catch scrapers, never by a person signing up.
const TRAP_LOCAL_PART = /spam[._-]?trap|honey[._-]?pot/;

// Shared inboxes nobody signed up with personally; they complain and bounce more than people do.
const ROLE_LOCAL_PARTS = new Set([
	"abuse",
	"accounting",
	"admin",
	"administrator",
	"billing",
	"careers",
	"compliance",
	"contact",
	"customerservice",
	"enquiries",
	"feedback",
	"hello",
	"help",
	"helpdesk",
	"hostmaster",
	"hr",
	"info",
	"inquiries",
	"jobs",
	"legal",
	"mail",
	"mailer-daemon",
	"marketing",
	"media",
	"newsletter",
	"no-reply",
	"noreply",
	"office",
	"postmaster",
	"press",
	"privacy",
	"root",
	"sales",
	"security",
	"spam",
	"support",
	"team",
	"webmaster",
]);

// For a normalized address: why it shouldn't become a contact that gets emails, or null.
export function getDropReason(email) {
	const [localPart, domain] = email.split("@");
	if (TRAP_LOCAL_PART.test(localPart)) return "trap";
	if (getEmailSuggestion(email)) return "typo";
	if (ROLE_LOCAL_PARTS.has(localPart.split("+")[0])) return "role";
	if (isDisposableDomain(domain)) return "disposable";
	return null;
}

// A signup form, add_contact or MCP adding one normalized address: what to tell the person typing it, or null.
// Role and throwaway addresses still sign up, since people do sign up with them themselves.
export function getSignupEmailProblem(email) {
	const suggestion = getEmailSuggestion(email);
	if (suggestion) return `Querias dizer ${suggestion}?`;
	if (TRAP_LOCAL_PART.test(email.split("@")[0])) return "Este endereço não pode ser adicionado";
	return null;
}

export function emptyDropped() {
	return Object.fromEntries(Object.keys(DROP_REASONS).map((reason) => [reason, 0]));
}

export function addDropped(total, dropped) {
	return Object.fromEntries(Object.keys(DROP_REASONS).map((reason) => [reason, (total[reason] ?? 0) + (dropped[reason] ?? 0)]));
}
