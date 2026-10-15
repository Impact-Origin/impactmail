"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { addContact } from "@/app/(app)/contacts/actions";
import { statusLabel } from "@/components/BadgeStatus";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";

// Into the newsletter the page shows.
export default function DialogAddContact({ newsletter, variant = "outline", size }) {
	const [isOpen, setIsOpen] = useState(false);
	const [formKey, setFormKey] = useState(0);

	function changeOpen(open) {
		setIsOpen(open);
		if (!open) setFormKey((key) => key + 1);
	}

	return (
		<Dialog open={isOpen} onOpenChange={changeOpen}>
			<DialogTrigger asChild>
				<Button variant={variant} size={size} disabled={!newsletter}>
					<Plus data-icon="inline-start" />
					Adicionar contacto
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<FormContact key={formKey} newsletter={newsletter} onClose={() => changeOpen(false)} />
			</DialogContent>
		</Dialog>
	);
}

function FormContact({ newsletter, onClose }) {
	const [email, setEmail] = useState("");
	const [hasConsent, setHasConsent] = useState(false);
	const [state, action, isPending] = useActionState(async (previous, formData) => {
		const result = await addContact(previous, formData);
		if (!result?.error) {
			onClose();
			toast.success(getAddedMessage(result));
		}
		return result;
	}, null);

	return (
		<form action={action} className="flex flex-col gap-4">
			<DialogHeader>
				<DialogTitle>Adicionar um contacto</DialogTitle>
				<DialogDescription>
					Entra em <span className="font-medium text-foreground">{newsletter?.name}</span> de imediato, sem email de
					confirmação.
				</DialogDescription>
			</DialogHeader>
			<input type="hidden" name="newsletterId" value={newsletter?.id ?? ""} />
			<Input
				type="email"
				name="email"
				value={email}
				onChange={(event) => setEmail(event.target.value)}
				placeholder="Email, por exemplo joana@example.com"
				aria-label="Email"
				required
				autoFocus
				maxLength={320}
				autoComplete="email"
				spellCheck={false}
			/>
			<label className="flex items-start gap-2.5 text-sm">
				<input
					type="checkbox"
					name="consent"
					checked={hasConsent}
					onChange={(event) => setHasConsent(event.target.checked)}
					required
					className="mt-0.5 size-4 shrink-0 accent-foreground"
				/>
				Esta pessoa aceitou receber os meus emails
			</label>
			{state?.error && <p className="text-sm text-destructive">{state.error}</p>}
			<DialogFooter>
				<Button type="submit" disabled={!hasConsent || isPending} className="min-w-20">
					{isPending ? <Loader2 className="animate-spin" /> : "Adicionar"}
				</Button>
			</DialogFooter>
		</form>
	);
}

// A suppressed address joins as bounced, complained or unsubscribed.
function getAddedMessage({ email, status }) {
	return status === "active" ? `${email} adicionado` : `${email} adicionado como ${statusLabel(status).toLowerCase()}`;
}
