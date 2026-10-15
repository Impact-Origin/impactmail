"use client";

import { useState, useTransition } from "react";
import { Loader2, Search, Trash2 } from "lucide-react";
import { findUndeliverableAddress, removeUndeliverableAddress } from "@/app/admin/actions";
import BadgeStatus from "@/components/BadgeStatus";
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
import { Input } from "@/components/ui/input";
import { formatDate, formatNumber } from "@/lib/format";
import { toast } from "@/lib/toast";

const REASONS = { bounce: "Devolução definitiva", trap: "Armadilha de spam" };

// The never-email list every account shares (lib/global-suppressions.js): its size, an address looked up, and a wrong
// entry taken off.
export default function CardUndeliverable({ bounces, traps }) {
	const [email, setEmail] = useState("");
	const [result, setResult] = useState(null);
	const [isLooking, startLooking] = useTransition();

	function lookUp(event) {
		event.preventDefault();
		startLooking(async () => {
			const answer = await findUndeliverableAddress(email);
			if (answer?.error) return void toast.error(answer.error);
			setResult(answer);
		});
	}

	return (
		<div className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-border">
			<div className="flex min-w-0 flex-col gap-1">
				<p className="text-sm font-medium tabular-nums">
					{formatNumber(bounces)} {bounces === 1 ? "devolução definitiva" : "devoluções definitivas"} · {formatNumber(traps)} {traps === 1 ? "armadilha" : "armadilhas"} de spam
				</p>
				<p className="text-xs text-pretty text-muted-foreground">
					Todas as contas os ignoram em importações, inscrições e envios. As devoluções definitivas ficam 180 dias, as armadilhas de spam para sempre.
				</p>
			</div>
			<form onSubmit={lookUp} className="flex gap-2">
				<Input
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder="Email, por exemplo joana@example.com"
					aria-label="Email"
					required
					maxLength={320}
					autoComplete="off"
					spellCheck={false}
				/>
				<Button type="submit" variant="outline" disabled={isLooking} className="min-w-24">
					{isLooking ? <Loader2 className="animate-spin" /> : <Search data-icon="inline-start" />}
					Procurar
				</Button>
			</form>
			{result && <ResultLookup result={result} onRemoved={() => setResult({ email: result.email, entry: null })} />}
		</div>
	);
}

function ResultLookup({ result, onRemoved }) {
	const [isConfirming, setIsConfirming] = useState(false);
	const [isRemoving, startRemoving] = useTransition();
	const { email, entry } = result;

	function remove() {
		startRemoving(async () => {
			const answer = await removeUndeliverableAddress(email);
			if (answer?.error) return void toast.error(answer.error);
			setIsConfirming(false);
			onRemoved();
			const restored = answer.restored > 0 && `${formatNumber(answer.restored)} ${answer.restored === 1 ? "contacto voltou" : "contactos voltaram"} a estar ativos`;
			toast.success("Removido da lista", restored ? { description: restored } : undefined);
		});
	}

	if (!entry) {
		return (
			<p className="text-sm text-muted-foreground">
				<span className="font-medium wrap-anywhere text-foreground">{email}</span> não está na lista.
			</p>
		);
	}
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5 animate-fade-in">
			<div className="flex min-w-0 flex-col gap-1.5">
				<span className="text-sm font-medium wrap-anywhere">{email}</span>
				<span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums">
					<BadgeStatus status={entry.reason === "trap" ? "blocked" : "bounced"} label={REASONS[entry.reason]} />
					Desde {formatDate(entry.listedAt)}
					{entry.detail && ` (${entry.detail})`}, {entry.expiresAt ? `sai a ${formatDate(entry.expiresAt)}` : "para sempre"}
				</span>
			</div>
			<Button variant="destructive" size="sm" onClick={() => setIsConfirming(true)}>
				<Trash2 data-icon="inline-start" />
				Remover
			</Button>
			<Dialog open={isConfirming} onOpenChange={setIsConfirming}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Remover da lista?</DialogTitle>
						<DialogDescription>
							<span className="font-medium wrap-anywhere text-foreground">{email}</span> pode voltar a ser importado, adicionado e a
							receber emails em todas as contas, e os contactos que a lista parou com ele voltam a estar ativos.
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
		</div>
	);
}
