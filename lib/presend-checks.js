import { LIMITS } from "./config.js";
import { UNSUBSCRIBE_PLACEHOLDER, hasContent } from "./render-email.js";

export function getPresendChecks({
	campaign,
	newsletter,
	rendered,
	senderProblem = null,
	isSendingEnabled,
	accountProblem = null,
}) {
	const subject = campaign.subject?.trim() ?? "";

	const checks = [
		{ id: "subject", label: "Assunto", isOk: subject.length > 0, message: "Adiciona um assunto" },
		{
			id: "subject-length",
			label: "Assunto com menos de 70 caracteres",
			isOk: subject.length <= 70,
			isWarning: true,
			detail: subject.length ? String(subject.length) : null,
		},
		{
			id: "preview",
			label: "Texto de pré-visualização",
			isOk: Boolean(campaign.previewText?.trim()),
			isWarning: true,
		},
		{ id: "content", label: "Conteúdo", isOk: hasContent(campaign.body), message: "Adiciona conteúdo" },
		{
			id: "unsubscribe",
			label: "Link para cancelar a subscrição",
			isOk: rendered.html.includes(UNSUBSCRIBE_PLACEHOLDER),
			message: `Adiciona ${UNSUBSCRIBE_PLACEHOLDER} ao HTML`,
		},
		{
			id: "size",
			label: "Menos de 100 KB",
			isOk: rendered.bytes <= LIMITS.maxEmailBytes,
			detail: `${Math.ceil(rendered.bytes / 1000)} KB`,
			message: "O Gmail corta emails com mais de 100 KB",
		},
		{
			id: "address",
			label: "Morada postal",
			isOk: Boolean(newsletter.postalAddress?.trim()),
			message: "Adiciona uma morada postal à newsletter",
		},
		{
			id: "domain",
			label: "Endereço de envio permitido",
			isOk: !senderProblem,
			message: senderProblem,
		},
		{ id: "test", label: "Teste enviado", isOk: Boolean(campaign.testSentAt), isWarning: true },
		{ id: "account", label: "A conta pode enviar", isOk: !accountProblem, message: accountProblem },
		{ id: "sending", label: "Envio ligado", isOk: isSendingEnabled, message: "O envio está desligado" },
	];

	return {
		checks,
		blocking: checks.filter(({ isOk, isWarning }) => !isOk && !isWarning),
	};
}
