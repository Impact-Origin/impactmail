"use client";

import { useActionState, useEffect, useRef } from "react";
import { HeartHandshake, Link2Off, Loader2, MailCheck } from "lucide-react";
import { keepSending } from "@/app/keep/actions";
import CardNotice from "@/components/CardNotice";
import { Button } from "@/components/ui/button";

// Link scanners open the page without submitting forms, so only a person's browser says yes.
export default function FormKeep({ token, newsletterName, archiveUrl }) {
	const [state, action, isPending] = useActionState(keepSending.bind(null, token), null);
	const formRef = useRef(null);

	useEffect(() => {
		formRef.current?.requestSubmit();
	}, []);

	if (state?.ok) {
		return (
			<CardNotice icon={MailCheck} tone="success" title={`Vais continuar a receber ${newsletterName}`}>
				Obrigado por me dizeres. A próxima edição chega à tua caixa de entrada.
				{archiveUrl && (
					<Button asChild size="lg" variant="outline" className="mt-6 w-full">
						<a href={archiveUrl}>Ler edições anteriores</a>
					</Button>
				)}
			</CardNotice>
		);
	}

	if (state?.error === "invalid") {
		return (
			<CardNotice icon={Link2Off} title="Este link não funciona">
				Pode ter mais de 90 dias, ou cancelaste a subscrição. Inscreve-te de novo para receberes {newsletterName}.
				{archiveUrl && (
					<Button asChild size="lg" variant="outline" className="mt-6 w-full">
						<a href={archiveUrl}>Inscrever-me de novo</a>
					</Button>
				)}
			</CardNotice>
		);
	}

	return (
		<CardNotice
			icon={isPending ? Loader2 : HeartHandshake}
			spin={isPending}
			title={`Continuar a receber ${newsletterName}?`}
		>
			{state?.error === "busy"
				? "Demasiados cliques a partir da tua rede. Tenta de novo daqui a alguns minutos."
				: "Um clique e continuas a recebê-la."}
			<form ref={formRef} action={action} className="mt-6">
				<Button type="submit" size="lg" disabled={isPending} className="w-full">
					{isPending ? "A guardar…" : "Sim, continuem a enviar"}
				</Button>
			</form>
		</CardNotice>
	);
}
