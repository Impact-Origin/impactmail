import { Hourglass, MailQuestionMark, Moon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";

// The list cleanup's share of a send (lib/cleanup.js summarizePreview).
export default function ListCleanupPreview({ summary, isCounting, error }) {
	if (isCounting) return <Skeleton className="h-[5.25rem] rounded-lg" />;
	if (error) {
		return (
			<p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
				Não foi possível contar a limpeza da lista. Corre na mesma quando a edição for enviada.
			</p>
		);
	}
	if (!summary) return null;

	const rows = [
		{ icon: MailQuestionMark, count: summary.lastChance, label: "recebem antes o email de última oportunidade" },
		{ icon: Moon, count: summary.dormant, label: "ficam inativos" },
		{ icon: Hourglass, count: summary.waiting, label: "não a recebem enquanto têm tempo para responder" },
	].filter(({ count }) => count > 0);

	return (
		<div className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
			<p className="font-medium">Limpeza da lista</p>
			{rows.length > 0 ? (
				<ul className="mt-1.5 flex flex-col gap-1">
					{rows.map(({ icon: Icon, count, label }) => (
						<li key={label} className="flex items-center gap-2 text-muted-foreground">
							<Icon className="size-3.5 shrink-0" aria-hidden="true" />
							<span>
								<span className="font-medium text-foreground tabular-nums">{formatNumber(count)}</span> {label}
							</span>
						</li>
					))}
				</ul>
			) : (
				<p className="mt-0.5 text-muted-foreground">Ninguém neste envio está inativo.</p>
			)}
		</div>
	);
}
