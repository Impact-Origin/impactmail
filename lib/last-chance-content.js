export const KEEP_URL_PLACEHOLDER = "{{keep_url}}";

// What a cold contact gets instead of an issue (lib/cleanup.js). One question, one button.
export function getLastChanceContent(newsletter) {
	const name = newsletter?.name?.trim() || "esta newsletter";
	return {
		format: "markdown",
		subject: `Ainda queres receber ${name}?`,
		previewText: "Clica no botão e continuas a recebê-la.",
		markdown: `**Ainda queres receber ${name}?**

Há algum tempo que não a abres, por isso estou a confirmar antes de deixar de a enviar.

<a href="${KEEP_URL_PLACEHOLDER}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:17px;font-weight:600;padding:14px 28px;border-radius:10px;">Sim, continuem a enviar</a>

Se não tiver notícias tuas, este é o último email de ${name} que vais receber.`,
	};
}
