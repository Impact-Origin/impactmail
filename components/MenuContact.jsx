"use client";

import { useState, useTransition } from "react";
import { Loader2, MoreHorizontal, Trash2, UserCheck, UserX } from "lucide-react";
import { deleteContact, setContactStatus } from "@/app/(app)/contacts/actions";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/toast";

const SUBSCRIBED_STATUSES = ["active", "dormant"];
// Deleted, they leave their status behind (lib/contacts.js).
const AFTER_DELETE = {
	unsubscribed: "Cancelou a subscrição, por isso adicioná-lo de novo não lhe envia emails.",
	bounced: "O endereço foi devolvido, por isso adicioná-lo de novo não lhe envia emails.",
	complained: "Marcou um email como spam, por isso adicioná-lo de novo não lhe envia emails.",
};

export default function MenuContact({ id, email, status }) {
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const isSubscribed = SUBSCRIBED_STATUSES.includes(status);

	function update(nextStatus) {
		startTransition(async () => {
			const result = await setContactStatus(id, nextStatus);
			if (result?.error) toast.error(result.error);
		});
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={`Ações para ${email}`}
						disabled={isPending}
						className="text-muted-foreground hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground"
					>
						{isPending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-44">
					{status === "dormant" && (
						<DropdownMenuItem onSelect={() => update("active")}>
							<UserCheck />
							Reativar
						</DropdownMenuItem>
					)}
					{isSubscribed && (
						<>
							<DropdownMenuItem variant="destructive" onSelect={() => update("unsubscribed")}>
								<UserX />
								Cancelar subscrição
							</DropdownMenuItem>
							<DropdownMenuSeparator />
						</>
					)}
					<DropdownMenuItem variant="destructive" onSelect={() => setIsDeleteOpen(true)}>
						<Trash2 />
						Eliminar contacto
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<DialogDeleteContact id={id} email={email} status={status} isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen} />
		</>
	);
}

function DialogDeleteContact({ id, email, status, isOpen, onOpenChange }) {
	const [isDeleting, startDeleting] = useTransition();

	function remove() {
		startDeleting(async () => {
			const result = await deleteContact(id);
			if (result?.error) return void toast.error(result.error);
			onOpenChange(false);
			toast.success("Contacto eliminado");
		});
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Eliminar este contacto?</DialogTitle>
					<DialogDescription>
						<span className="font-medium wrap-anywhere text-foreground">{email}</span> sai dos teus contactos.{" "}
						{AFTER_DELETE[status] ?? "Pode ser adicionado de novo mais tarde."}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancelar</Button>
					</DialogClose>
					<Button variant="destructive" onClick={remove} disabled={isDeleting} className="min-w-20">
						{isDeleting ? <Loader2 className="animate-spin" /> : "Eliminar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
