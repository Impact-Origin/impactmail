"use client";

import { useActionState, useEffect, useRef } from "react";
import { Link2Off, Loader2, MailCheck } from "lucide-react";
import { confirmSubscription } from "@/app/confirm/actions";
import CardNotice from "@/components/CardNotice";
import { Button } from "@/components/ui/button";

// Link scanners open the page without submitting forms, so only a person's browser confirms.
export default function FormConfirm({ token, newsletterName, fromName, fromEmail, archiveUrl }) {
	const [state, action, isPending] = useActionState(confirmSubscription.bind(null, token), null);
	const formRef = useRef(null);

	useEffect(() => {
		formRef.current?.requestSubmit();
	}, []);

	if (state?.ok) {
		return (
			<CardNotice icon={MailCheck} tone="success" title="Estás dentro">
				A próxima edição de {newsletterName} chega de{" "}
				<span className="font-medium text-foreground">{fromName || fromEmail}</span>
				{fromName && ` (${fromEmail})`}. Se for parar a Promoções, arrasta-a para Principal.
				{archiveUrl && (
					<Button asChild size="lg" variant="outline" className="mt-6 w-full">
						<a href={archiveUrl}>Ler edições anteriores</a>
					</Button>
				)}
			</CardNotice>
		);
	}

	if (state?.error) {
		return (
			<CardNotice icon={Link2Off} title="Este link não funciona">
				Pode ter mais de 30 dias. Inscreve-te de novo e usa o email de confirmação mais recente.
			</CardNotice>
		);
	}

	return (
		<CardNotice
			icon={isPending ? Loader2 : MailCheck}
			spin={isPending}
			title={`Confirma a tua subscrição de ${newsletterName}`}
		>
			Um clique e a próxima edição chega à tua caixa de entrada.
			<form ref={formRef} action={action} className="mt-6">
				<Button type="submit" size="lg" disabled={isPending} className="w-full">
					{isPending ? "A confirmar…" : "Confirmar a minha subscrição"}
				</Button>
			</form>
		</CardNotice>
	);
}
