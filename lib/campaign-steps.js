
// The campaign editor's steps (FormCampaign): write the issue, review it, send it.
export const CAMPAIGN_STEPS = [
	{ id: "write", label: "Escrever" },
	{ id: "review", label: "Rever" },
	{ id: "send", label: "Enviar" },
];

// What the review step offers for a check that needs a look (lib/presend-checks.js): a field of the draft, a page or
// the test email. Warnings have no message of their own, so they get a hint. A settings field (FormNewsletter's id)
// opens scrolled to and focused.
const FIXES = {
	subject: { label: "Editar assunto", field: "subject" },
	"subject-length": { label: "Editar assunto", field: "subject", hint: "As caixas de entrada cortam assuntos mais longos" },
	preview: { label: "Adicionar texto de pré-visualização", field: "previewText", hint: "Aparece depois do assunto na caixa de entrada" },
	content: { label: "Editar conteúdo", field: "body" },
	unsubscribe: { label: "Editar HTML", field: "body" },
	size: { label: "Editar conteúdo", field: "body" },
	address: { label: "Adicionar uma morada postal", page: "settings", field: "postal-address" },
	domain: { label: "Abrir definições", page: "settings" },
	test: { label: "Enviar um teste", action: "test", hint: "Vê-o numa caixa de entrada real antes dos teus leitores" },
};

export function getCheckFix(check, { newsletterId }) {
	const fix = FIXES[check.id];
	if (fix?.page !== "settings") return fix ?? null;
	const { page, field, ...rest } = fix;
	// The editor opened its newsletter already, and /newsletters/<id>'s redirect would drop the #.
	return { ...rest, href: field ? `/newsletters#${field}` : `/newsletters/${newsletterId}` };
}

// Why the send step's button can't go yet, or null: the same rules as the send and schedule dialogs had.
export function getSendProblem({
	choice,
	blockingMessage,
	scheduledAt,
	scheduleProblem,
	sendEmails,
	scheduleRecipients,
}) {
	if (choice === "later") {
		if (blockingMessage && !scheduledAt) return blockingMessage;
		return scheduleProblem || (scheduleRecipients === 0 ? NO_RECIPIENTS : null);
	}
	if (blockingMessage) return blockingMessage;
	if (sendEmails === 0) return NO_RECIPIENTS;
	return null;
}

const NO_RECIPIENTS = "Não há contactos para enviar";
