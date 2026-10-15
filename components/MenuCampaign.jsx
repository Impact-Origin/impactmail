"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChartColumn, Copy, ExternalLink, Link2, Loader2, MoreHorizontal, PenLine, Trash2 } from "lucide-react";
import { duplicateCampaign } from "@/app/(app)/campaigns/actions";
import DialogDiscardCampaign from "@/components/DialogDiscardCampaign";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/toast";

const EDITABLE_STATUSES = ["draft", "scheduled"];

export default function MenuCampaign({ id, status, subject, scheduledAt, pageUrl }) {
	const [isDiscardOpen, setIsDiscardOpen] = useState(false);
	const [isDuplicating, startDuplicating] = useTransition();
	const isEditable = EDITABLE_STATUSES.includes(status);

	function duplicate() {
		startDuplicating(async () => {
			const result = await duplicateCampaign(id);
			if (result?.error) toast.error(result.error);
		});
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(pageUrl);
			toast.success("Link copiado");
		} catch {
			toast.error("Não foi possível copiar o link");
		}
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={`Ações para ${subject || "Sem título"}`}
						disabled={isDuplicating}
						className="relative z-10 text-muted-foreground hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground"
					>
						{isDuplicating ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-44">
					<DropdownMenuItem asChild>
						<Link href={`/campaigns/${id}`}>
							{isEditable ? <PenLine /> : <ChartColumn />}
							{isEditable ? "Editar" : "Abrir relatório"}
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={duplicate}>
						<Copy />
						Duplicar
					</DropdownMenuItem>
					{pageUrl && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem onSelect={copyLink}>
								<Link2 />
								Copiar link
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<a href={pageUrl} target="_blank" rel="noreferrer">
									<ExternalLink />
									Ver página
								</a>
							</DropdownMenuItem>
						</>
					)}
					{isEditable && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem variant="destructive" onSelect={() => setIsDiscardOpen(true)}>
								<Trash2 />
								Descartar
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			{isEditable && (
				<DialogDiscardCampaign
					id={id}
					subject={subject}
					scheduledAt={status === "scheduled" ? scheduledAt : null}
					isOpen={isDiscardOpen}
					onOpenChange={setIsDiscardOpen}
				/>
			)}
		</>
	);
}
