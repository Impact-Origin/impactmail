import { CircleAlert, Link2Off, MailCheck, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectDb } from "@/lib/db";
import { findNewsletterAnywhere } from "@/lib/public-newsletters";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import Contact from "@/models/Contact";

// The URL carries the unsubscribe token: keep it out of search results and referrer headers.
export const metadata = {
	title: "Cancelar subscrição",
	robots: { index: false, follow: false },
	referrer: "no-referrer",
};

const SUBSCRIBED_STATUSES = ["active", "dormant"];

export default async function UnsubscribePage({ searchParams }) {
	const { token, status } = await searchParams;
	const validToken = typeof token === "string" ? token : null;
	const reference = verifyUnsubscribeToken(validToken);
	const subscription = reference ? await getSubscription(reference) : null;
	const view = getView({ reference, status, subscription });
	const { icon: Icon, title, description } = getCopy(view, subscription?.newsletterName);
	const hasForm = view === "confirm" || view === "error";

	return (
		<main className="flex min-h-dvh items-center justify-center bg-background px-4 py-16">
			<div className="w-full max-w-sm rounded-xl bg-card p-6 text-center shadow-border sm:p-8">
				<div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
					<Icon className="size-5" aria-hidden="true" />
				</div>
				<h1 className="mt-4 text-lg font-semibold tracking-tight text-balance">{title}</h1>
				<p className="mt-1.5 text-sm leading-relaxed text-pretty text-muted-foreground">
					{description}
				</p>

				{hasForm && (
					<form method="post" action={`/api/unsubscribe?token=${validToken}`} className="mt-6">
						<input type="hidden" name="source" value="page" />
						<Button type="submit" size="lg" className="w-full">
							Cancelar subscrição
						</Button>
					</form>
				)}
			</div>
		</main>
	);
}

async function getSubscription({ contactId, newsletterId }) {
	try {
		await connectDb();
		const newsletter = await findNewsletterAnywhere({ _id: newsletterId });
		const contact =
			newsletter &&
			(await Contact.findOne({ accountId: newsletter.accountId, _id: contactId, newsletterId })
				.select({ status: 1 })
				.lean());
		return {
			newsletterName: newsletter?.name,
			isSubscribed: !contact || SUBSCRIBED_STATUSES.includes(contact.status),
		};
	} catch (error) {
		console.error("[unsubscribe] Could not load the subscription:", error.message);
		return { isSubscribed: true };
	}
}

function getView({ reference, status, subscription }) {
	if (!reference) return "invalid";
	if (status === "done" || status === "error") return status;
	return subscription?.isSubscribed === false ? "done" : "confirm";
}

function getCopy(view, newsletterName) {
	const name = newsletterName || "esta newsletter";
	return {
		invalid: {
			icon: Link2Off,
			title: "Este link não funciona",
			description:
				"Abre de novo o link para cancelar a subscrição no email, ou responde ao email a pedir para seres removido.",
		},
		confirm: {
			icon: MailX,
			title: `Cancelar a subscrição de ${name}?`,
			description: "Vais deixar de receber os seus emails.",
		},
		error: {
			icon: CircleAlert,
			title: "Algo correu mal",
			description: `Continuas inscrito em ${name}. Tenta de novo daqui a um minuto.`,
		},
		done: {
			icon: MailCheck,
			title: "Cancelaste a subscrição",
			description: `Já não vais receber emails de ${name}.`,
		},
	}[view];
}
