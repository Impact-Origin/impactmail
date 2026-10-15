"use client";

import { useState, useTransition } from "react";
import { Ban, Loader2, MoreHorizontal, ShieldCheck } from "lucide-react";
import { blockAccountAction, unblockAccountAction } from "@/app/admin/actions";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";

// blockedBy: who blocked it, while it's blocked.
export default function MenuAccount({ accountId, email, blockedBy, blockReason, providerName }) {
	const [dialog, setDialog] = useState(null);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon-sm" aria-label="Actions">
						<MoreHorizontal />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-56">
					{blockedBy ? (
						<DropdownMenuItem onSelect={() => setDialog("unblock")}>
							<ShieldCheck />
							Unblock account
						</DropdownMenuItem>
					) : (
						<DropdownMenuItem variant="destructive" onSelect={() => setDialog("block")}>
							<Ban />
							Block account
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			<Dialog open={dialog !== null} onOpenChange={(isOpen) => !isOpen && setDialog(null)}>
				<DialogContent className="sm:max-w-sm">
					{dialog === "block" && <FormBlock accountId={accountId} email={email} providerName={providerName} onDone={() => setDialog(null)} />}
					{dialog === "unblock" && (
						<FormUnblock accountId={accountId} email={email} blockedBy={blockedBy} blockReason={blockReason} onDone={() => setDialog(null)} />
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

function FormBlock({ accountId, email, providerName, onDone }) {
	const [reason, setReason] = useState("");
	const [isPending, startTransition] = useTransition();

	function block(event) {
		event.preventDefault();
		startTransition(async () => {
			const result = await blockAccountAction(accountId, reason);
			if (result?.error) return toast.error(result.error);
			toast.success("Account blocked");
			onDone();
		});
	}

	return (
		<form onSubmit={block} className="flex flex-col gap-4">
			<DialogHeader>
				<DialogTitle>Block account?</DialogTitle>
				<DialogDescription>
					{email ?? "This account"} sends nothing until you unblock it, welcome emails included, and can only read, pause and
					cancel. Its {providerName} tenant is suspended.
				</DialogDescription>
			</DialogHeader>
			<Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason, shown to them" maxLength={200} />
			<DialogFooter>
				<DialogClose asChild>
					<Button variant="outline">Cancel</Button>
				</DialogClose>
				<Button type="submit" variant="destructive" disabled={isPending} className="min-w-20">
					{isPending ? <Loader2 className="animate-spin" /> : "Block"}
				</Button>
			</DialogFooter>
		</form>
	);
}

function FormUnblock({ accountId, email, blockedBy, blockReason, onDone }) {
	const [isPending, startTransition] = useTransition();

	function unblock(event) {
		event.preventDefault();
		startTransition(async () => {
			const result = await unblockAccountAction(accountId);
			if (result?.error) return toast.error(result.error);
			toast.success("Account unblocked");
			onDone();
		});
	}

	return (
		<form onSubmit={unblock} className="flex flex-col gap-4">
			<DialogHeader>
				<DialogTitle>Unblock account?</DialogTitle>
				<DialogDescription>
					{email ?? "This account"} can send again. Its paused campaigns stay paused until its owner resumes them.
				</DialogDescription>
			</DialogHeader>
			<p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-pretty">
				{blockedBy}
				{blockReason && `: ${blockReason}`}
			</p>
			<DialogFooter>
				<DialogClose asChild>
					<Button variant="outline">Cancel</Button>
				</DialogClose>
				<Button type="submit" disabled={isPending} className="min-w-24">
					{isPending ? <Loader2 className="animate-spin" /> : "Unblock"}
				</Button>
			</DialogFooter>
		</form>
	);
}
