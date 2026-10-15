"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createApiKey } from "@/app/(app)/api-keys/actions";
import ButtonCopy from "@/components/ButtonCopy";
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

export default function DialogCreateApiKey() {
	const [isOpen, setIsOpen] = useState(false);
	const [formKey, setFormKey] = useState(0);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				setIsOpen(open);
				if (!open) setFormKey((key) => key + 1);
			}}
		>
			<DialogTrigger asChild>
				<Button>
					<Plus data-icon="inline-start" />
					Nova
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<FormApiKey key={formKey} />
			</DialogContent>
		</Dialog>
	);
}

function FormApiKey() {
	const [state, action, isPending] = useActionState(createApiKey, null);

	if (state?.key) {
		return (
			<>
				<DialogHeader>
					<DialogTitle>Copia a tua chave</DialogTitle>
					<DialogDescription>
						{state.level === "signups"
							? "Só é mostrada uma vez. Só pode adicionar contactos, por isso pode ir no código do teu site."
							: "Só é mostrada uma vez. Guarda-a num servidor ou nas definições do teu assistente de IA, nunca numa página web."}
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-center gap-1 rounded-lg bg-muted py-1 pr-1 pl-3">
					<code className="min-w-0 flex-1 truncate font-mono text-[13px]">{state.key}</code>
					<ButtonCopy value={state.key} label="Copiar chave" />
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button>Concluir</Button>
					</DialogClose>
				</DialogFooter>
			</>
		);
	}

	return (
		<form action={action} className="flex flex-col gap-4">
			<DialogHeader>
				<DialogTitle>Nova chave de API</DialogTitle>
				<DialogDescription>Para a API REST e o servidor MCP.</DialogDescription>
			</DialogHeader>
			<Input name="name" placeholder="Nome, por exemplo Inscrições do site" required autoFocus maxLength={60} />
			<fieldset className="grid gap-2">
				<legend className="sr-only">Acesso</legend>
				{LEVELS.map(({ value, label, description }) => (
					<label
						key={value}
						className="flex items-start gap-3 rounded-lg p-3 shadow-border transition-[box-shadow,background-color] duration-150 hover:shadow-border-hover has-checked:bg-muted/60 has-checked:shadow-border-hover"
					>
						<input
							type="radio"
							name="level"
							value={value}
							defaultChecked={value === "full"}
							className="mt-0.5 size-4 shrink-0 accent-foreground"
						/>
						<span className="flex flex-col gap-0.5">
							<span className="text-sm font-medium">{label}</span>
							<span className="text-xs text-pretty text-muted-foreground">{description}</span>
						</span>
					</label>
				))}
			</fieldset>
			{state?.error && <p className="text-sm text-destructive">{state.error}</p>}
			<DialogFooter>
				<Button type="submit" disabled={isPending} className="min-w-20">
					{isPending ? <Loader2 className="animate-spin" /> : "Criar"}
				</Button>
			</DialogFooter>
		</form>
	);
}

const LEVELS = [
	{
		value: "full",
		label: "Acesso total",
		description: "Tudo o que o dashboard faz: campanhas, contactos, domínios. Para scripts e assistentes de IA.",
	},
	{ value: "signups", label: "Só inscrições", description: "Adiciona contactos e mais nada, para formulários de inscrição no teu site." },
];
