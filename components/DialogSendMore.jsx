"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { sendCampaignToMore } from "@/app/(app)/campaigns/actions";
import InputAudienceLimit, { countRecipients } from "@/components/InputAudienceLimit";
import ListCleanupPreview from "@/components/ListCleanupPreview";
import NoticeFirstSend from "@/components/NoticeFirstSend";
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
import { summarizePreview } from "@/lib/cleanup";
import { FIRST_SEND } from "@/lib/config";
import { formatCount, formatNumber } from "@/lib/format";
import { toast } from "@/lib/toast";
import { useToastError } from "@/lib/use-toast-error";
import { useCleanupPreview } from "@/lib/use-cleanup-preview";

export default function DialogSendMore({ campaignId, sentCount, remainingCount, isCleanupEnabled, newContacts = 0 }) {
	const router = useRouter();
	const toastError = useToastError();
	const [isOpen, setIsOpen] = useState(false);
	const [more, setMore] = useState("");
	const [isSending, startSending] = useTransition();
	const { preview, isCounting, loadPreview } = useCleanupPreview(campaignId);
	const moreNumber = Number.parseInt(more, 10);
	// The step reaches the top (sent so far + more) of the audience, like the send itself.
	const summary = preview?.enabled ? summarizePreview(preview, moreNumber > 0 ? sentCount + moreNumber : undefined) : null;
	const remaining = preview?.enabled ? Math.max(0, preview.issue - sentCount) : remainingCount;
	const recipients = countRecipients(more, remaining);
	const emails = recipients + (summary?.lastChance ?? 0);

	function changeOpen(nextIsOpen) {
		if (nextIsOpen && isCleanupEnabled) loadPreview();
		setIsOpen(nextIsOpen);
	}

	function send() {
		startSending(async () => {
			const result = await sendCampaignToMore(campaignId, { additional: Number.parseInt(more, 10) || undefined });
			if (result?.error) return toastError(result);
			setIsOpen(false);
			setMore("");
			toast.success("Passo seguinte iniciado");
			router.refresh();
		});
	}

	return (
		<Dialog open={isOpen} onOpenChange={changeOpen}>
			<DialogTrigger asChild>
				<Button>
					<Send data-icon="inline-start" />
					Enviar a mais
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle className="tabular-nums">Enviar para mais {formatCount(recipients, "contacto")}?</DialogTitle>
					<DialogDescription className="tabular-nums">
						{formatNumber(sentCount)} já a receberam. Recebem-na os contactos mais envolvidos que se seguem, e ninguém a recebe duas vezes.
					</DialogDescription>
				</DialogHeader>
				{newContacts > FIRST_SEND.minSlice && <NoticeFirstSend count={newContacts} />}
				<InputAudienceLimit label="Quantos mais" value={more} onChange={setMore} audienceCount={remaining} />
				{isCleanupEnabled && <ListCleanupPreview summary={summary} isCounting={isCounting} error={preview?.error} />}
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancelar</Button>
					</DialogClose>
					<Button onClick={send} disabled={isSending || emails === 0} className="min-w-20">
						{isSending ? <Loader2 className="animate-spin" /> : "Enviar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
