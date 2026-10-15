"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { removeDomainAction } from "@/app/(app)/domains/actions";
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
import { toast } from "@/lib/toast";

export default function DialogRemoveDomain({ id, domain, hasArchiveHost }) {
	const [isOpen, setIsOpen] = useState(false);
	const [isRemoving, startRemoving] = useTransition();

	function remove() {
		startRemoving(async () => {
			const result = await removeDomainAction(id);
			if (result?.error) return void toast.error(result.error);
			setIsOpen(false);
			toast.success(`${domain} removido`);
		});
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="ghost" size="icon-sm" aria-label={`Remover ${domain}`} className="text-muted-foreground hover:text-foreground">
					<Trash2 />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Remover {domain}?</DialogTitle>
					<DialogDescription>
						As newsletters deixam de poder enviar a partir dele{hasArchiveHost && ", e o subdomínio do site deixa de funcionar"}. Podes adicioná-lo de novo mais tarde.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancelar</Button>
					</DialogClose>
					<Button variant="destructive" onClick={remove} disabled={isRemoving} className="min-w-20">
						{isRemoving ? <Loader2 className="animate-spin" /> : "Remover"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
