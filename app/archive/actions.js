"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { sendAlert } from "@/lib/alerts";
import { isSendingEnabled } from "@/lib/config";
import { getSignupProblem, upsertContact } from "@/lib/contacts";
import { connectDb } from "@/lib/db";
import { getInbox } from "@/lib/inbox-links";
import { findSignupNewsletter } from "@/lib/public-newsletters";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { queueConfirmationEmail, queueWelcomeEmail } from "@/lib/sending";
import { normalizeEmail } from "@/lib/validation";

const PER_IP = { name: "subscribe-ip", limit: 5, window: "10 m" };
// Only alerts: refusing signups past a shared limit would let one flooder block every real signup.
// A flood from many IPs (list bombing) still needs a look: it fills the list with spam traps.
const PER_NEWSLETTER = { name: "subscribe-newsletter", limit: 300, window: "10 m" };

export async function subscribe(_state, formData) {
	// People never see this field; bots fill in every input they find.
	if (formData.get("website")) return { ok: true };

	const email = normalizeEmail(formData.get("email"));
	if (!email) return { error: "Introduz um email válido" };

	if (await isRateLimited({ ...PER_IP, key: getClientIp(await headers()) })) {
		return { error: "Demasiadas inscrições a partir da tua rede. Tenta de novo daqui a alguns minutos." };
	}
	const emailProblem = await getSignupProblem(email);
	if (emailProblem) return { error: emailProblem };

	await connectDb();
	const newsletter = await findSignupNewsletter({
		slug: String(formData.get("newsletter") ?? ""),
		archiveEnabled: true,
	});
	if (!newsletter) return { error: "Esta newsletter não está a aceitar inscrições" };

	if (await isRateLimited({ ...PER_NEWSLETTER, key: newsletter.slug })) {
		after(() =>
			sendAlert({
				accountId: newsletter.accountId,
				key: `signup-flood:${newsletter.slug}`,
				title: "Vaga de inscrições no site",
				detail: `Mais de ${PER_NEWSLETTER.limit} inscrições em ${newsletter.name} em 10 minutos. Continuam a entrar (${PER_IP.limit} por visitante a cada 10 minutos); verifica se há lixo nos novos contactos.`,
				path: "/contacts",
			})
		);
	}

	const { contact, created } = await upsertContact({ newsletter, email, source: "website", resubscribe: true });
	const isPending = contact.status === "pending";
	if (isSendingEnabled() && (isPending || (created && contact.status === "active"))) {
		const queue = isPending ? queueConfirmationEmail : queueWelcomeEmail;
		after(() =>
			queue({ newsletter, contact }).catch((error) =>
				console.error(`[subscribe] Signup email for ${contact._id} failed:`, error.message)
			)
		);
	}
	if (!isPending) return { ok: true };
	return { ok: true, pending: true, email, inbox: getInbox({ email, fromEmail: newsletter.fromEmail }) };
}
