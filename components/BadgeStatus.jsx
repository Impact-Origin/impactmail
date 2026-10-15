import { cn } from "@/lib/utils";

export default function BadgeStatus({ status, label, className }) {
	const key = String(status ?? "").toLowerCase();

	return (
		<span
			className={cn(
				"inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full pr-2.5 pl-2 text-xs font-medium whitespace-nowrap text-foreground/80 shadow-border",
				className
			)}
		>
			<span className={cn("size-1.5 rounded-full", DOT_TONES[STATUS_TONES[key] || "gray"])} />
			{label || statusLabel(key)}
		</span>
	);
}

export function statusLabel(status) {
	if (STATUS_LABELS[status]) return STATUS_LABELS[status];
	const text = status.replaceAll("_", " ");
	return text.charAt(0).toUpperCase() + text.slice(1);
}

const STATUS_LABELS = {
	active: "Ativo",
	sent: "Enviado",
	delivered: "Entregue",
	success: "Sucesso",
	verified: "Verificado",
	healthy: "Saudável",
	scheduled: "Agendado",
	sending: "A enviar",
	queued: "Em fila",
	paused: "Em pausa",
	pending: "Pendente",
	temporary_failure: "Falha temporária",
	probation: "Em observação",
	sandbox: "Sandbox",
	bounced: "Devolvido",
	complained: "Denunciado",
	failed: "Falhou",
	shutdown: "Desativado",
	deleting: "A eliminar",
	blocked: "Bloqueado",
	draft: "Rascunho",
	canceled: "Cancelado",
	unsubscribed: "Saiu",
	dormant: "Inativo",
	held: "Retido",
	suppressed: "Suprimido",
	skipped: "Ignorado",
	opened: "Aberto",
	clicked: "Clicado",
	revoked: "Revogado",
	failure: "Falha",
	not_started: "Não iniciado",
};

const DOT_TONES = {
	green: "bg-emerald-500",
	amber: "bg-amber-500",
	red: "bg-red-500",
	blue: "bg-sky-500",
	gray: "bg-zinc-400 dark:bg-zinc-500",
};

const STATUS_TONES = {
	active: "green",
	trialing: "green",
	past_due: "amber",
	incomplete: "amber",
	unpaid: "red",
	sent: "green",
	delivered: "green",
	success: "green",
	verified: "green",
	healthy: "green",
	scheduled: "blue",
	sending: "blue",
	queued: "blue",
	paused: "amber",
	pending: "amber",
	temporary_failure: "amber",
	probation: "amber",
	sandbox: "amber",
	bounced: "red",
	complained: "red",
	failed: "red",
	shutdown: "red",
	deleting: "red",
	blocked: "red",
};
