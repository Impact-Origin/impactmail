import "server-only";
import { APP_NAME, getEmailFrom } from "@/lib/config";
import { getEmailProvider, isEmailProviderConfigured } from "@/lib/email-provider";
import { escapeHtml } from "@/lib/render-email";

const RESEND_URL = "https://api.resend.com/emails";

async function sendWithResend({ from, to, subject, text, html }) {
	const response = await fetch(RESEND_URL, {
		method: "POST",
		headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
		body: JSON.stringify({ from, to: [to], subject, text, ...(html && { html }) }),
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) throw new Error(`Resend answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
}

// ImpactMail's own emails (sign-in codes, alerts) go through Resend, apart from customers' emails, so a problem at
// the email provider never blocks a login. Without RESEND_API_KEY they go through the email provider.
export async function sendPlatformEmail({ to, subject, text, html }) {
	const from = getEmailFrom();
	if (!from) throw new Error("EMAIL_FROM is not set: ImpactMail's own emails need a from address on a domain Resend or the email provider verified");
	if (process.env.RESEND_API_KEY) return sendWithResend({ from, to, subject, text, html });
	await getEmailProvider().sendPlatformEmail({ from, to, subject, text, html });
}

// Without a way out, alerts are only logged.
export function canSendPlatformEmail() {
	if (!getEmailFrom()) return false;
	return Boolean(process.env.RESEND_API_KEY) || isEmailProviderConfigured();
}

// Without a Resend key in development, the code shows in the server console instead. Never in production.
async function sendCode({ email, code, label, subject, purpose, ifNotAsked }) {
	if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === "development") {
		console.info(`[${label}] Code for ${email}: ${code}`);
		return;
	}
	const safeCode = escapeHtml(code);
	await sendPlatformEmail({
		to: email,
		subject,
		text: `${purpose}: ${code}. Expira daqui a 5 minutos.\n\n${ifNotAsked}`,
		html: `<div style="max-width:420px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#18181b"><p style="margin:0 0 12px;font-size:15px">${purpose}:</p><p style="margin:0 0 24px;font-size:32px;font-weight:600;letter-spacing:6px">${safeCode}</p><p style="margin:0;font-size:13px;line-height:1.5;color:#71717a">Expira daqui a 5 minutos. ${ifNotAsked}</p></div>`,
	});
}

export function sendSigninCode({ email, code }) {
	return sendCode({
		email,
		code,
		label: "signin",
		subject: `${code} é o teu código do ${APP_NAME}`,
		purpose: "O teu código de início de sessão",
		ifNotAsked: "Se não o pediste, podes ignorar este email.",
	});
}

// A subject of its own: the owner sees what a code is for, and that someone asked for it.
export function sendDeletionCode({ email, code }) {
	return sendCode({
		email,
		code,
		label: "account",
		subject: `${code} é o teu código para eliminar a tua conta ${APP_NAME}`,
		purpose: `O teu código para eliminar a tua conta ${APP_NAME}`,
		ifNotAsked: "Se não o pediste, não o partilhes: a tua conta fica como está.",
	});
}
