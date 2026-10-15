import { formatSentence } from "./format.js";

// Where the settings form starts a welcome email switched on with no subject and no content. Only a prefill:
// saved welcome emails go out as they are (lib/sending-rules.js).
export function prefillWelcome(welcome, newsletter) {
	if (welcome.subject.trim() || welcome.markdown.trim()) return welcome;
	const name = newsletter?.name?.trim() || "a newsletter";
	const intro = [`Obrigado por te juntares a ${name}.`, formatSentence(newsletter?.description)].filter(Boolean).join(" ");
	return {
		...welcome,
		subject: `Bem-vindo a ${name}`,
		markdown: `${intro}

A próxima edição chega à tua caixa de entrada. Responde a este email para dizeres olá.`,
	};
}
