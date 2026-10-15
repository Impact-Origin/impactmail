"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { deleteAccount, sendDeletionCode } from "@/app/(account)/account/actions";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";

const CODE_PATTERN = /^\d{6}$/;

export default function DialogDeleteAccount({ email, graceDays, isDisabled }) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button type="button" variant="destructive" disabled={isDisabled}>
					Eliminar conta
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<StepsDelete email={email} graceDays={graceDays} />
			</DialogContent>
		</Dialog>
	);
}

// Inside the dialog's content, which unmounts on close: each opening starts from the first step.
function StepsDelete({ email, graceDays }) {
	const [isCodeSent, setIsCodeSent] = useState(false);
	const [isSending, startSending] = useTransition();
	const [state, action, isDeleting] = useActionState(deleteAccount, null);
	const [code, setCode] = useState("");
	const [typedEmail, setTypedEmail] = useState("");
	const isConfirmed = CODE_PATTERN.test(code.replace(/\s/g, "")) && typedEmail.trim().toLowerCase() === email.toLowerCase();

	function sendCode() {
		startSending(async () => {
			const result = await sendDeletionCode();
			if (result?.error) return void toast.error(result.error);
			if (isCodeSent) toast.success(`Novo código enviado para ${email}`);
			setIsCodeSent(true);
		});
	}

	if (!isCodeSent) {
		return (
			<>
				<DialogHeader>
					<DialogTitle>Eliminar a tua conta?</DialogTitle>
					<DialogDescription>
						Para de imediato: a tua sessão é terminada em todo o lado, as chaves de API e as apps ligadas deixam de funcionar, e nada mais é enviado.
					</DialogDescription>
				</DialogHeader>
				<p className="text-sm text-pretty text-muted-foreground">
					Daqui a {graceDays} dias, as newsletters, contactos, campanhas e imagens são eliminados de vez. Inicia sessão antes disso para a restaurar.
				</p>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancelar</Button>
					</DialogClose>
					<Button onClick={sendCode} disabled={isSending} className="min-w-32">
						{isSending ? <Loader2 className="animate-spin" /> : "Enviar-me um código"}
					</Button>
				</DialogFooter>
			</>
		);
	}

	return (
		<form action={action} className="grid gap-4">
			<DialogHeader>
				<DialogTitle>Confirma que és tu</DialogTitle>
				<DialogDescription>
					Introduz o código enviado para <span className="font-medium text-foreground">{email}</span> e depois escreve o teu endereço de email.
				</DialogDescription>
			</DialogHeader>
			<div className="grid gap-2">
				<Label htmlFor="deletion-code">Código</Label>
				<Input
					id="deletion-code"
					name="code"
					value={code}
					onChange={(event) => setCode(event.target.value)}
					inputMode="numeric"
					autoComplete="one-time-code"
					placeholder="000000"
					maxLength={10}
					required
					autoFocus
					className="h-11 text-center font-mono text-lg tracking-[0.4em] tabular-nums"
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="deletion-email">Endereço de email</Label>
				<Input
					id="deletion-email"
					name="email"
					type="email"
					value={typedEmail}
					onChange={(event) => setTypedEmail(event.target.value)}
					placeholder={email}
					autoComplete="off"
					spellCheck={false}
					required
				/>
			</div>
			{state?.error && (
				<p role="alert" className="text-sm text-pretty text-destructive">
					{state.error}
				</p>
			)}
			<DialogFooter className="sm:items-center">
				<button
					type="button"
					onClick={sendCode}
					disabled={isSending}
					className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground disabled:opacity-50 sm:mr-auto"
				>
					{isSending ? "A enviar…" : "Enviar um novo código"}
				</button>
				<DialogClose asChild>
					<Button type="button" variant="outline">
						Cancelar
					</Button>
				</DialogClose>
				<Button type="submit" variant="destructive" disabled={!isConfirmed || isDeleting} className="min-w-32">
					{isDeleting ? <Loader2 className="animate-spin" /> : "Eliminar conta"}
				</Button>
			</DialogFooter>
		</form>
	);
}
