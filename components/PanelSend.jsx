"use client";

import { CalendarClock, Loader2, Send } from "lucide-react";
import AvatarNewsletter from "@/components/AvatarNewsletter";
import CardSettings from "@/components/CardSettings";
import InputCampaignSlug from "@/components/InputCampaignSlug";
import ListCleanupPreview from "@/components/ListCleanupPreview";
import NoticeFirstSend from "@/components/NoticeFirstSend";
import PickerSendTime from "@/components/PickerSendTime";
import RowCampaign from "@/components/RowCampaign";
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
import { FIRST_SEND } from "@/lib/config";
import { LOCALE, formatCount, formatNumber, formatSendTime } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";

// The send step: who gets the issue, then now or at a time. Its button is in the editor's
// bar, and lib/use-send-campaign.js holds what it does.
export default function PanelSend({
	sending,
	campaign,
	newsletter,
	subject,
	audienceCount,
	newContacts,
	archiveUrlBase,
}) {
	const isClient = useIsClient();
	const scheduledAt = campaign.status === "scheduled" ? campaign.scheduledAt : null;
	// The browser's time zone, which the server doesn't know.
	const scheduledTime = scheduledAt && isClient ? formatSendTime(scheduledAt) : null;
	const isNow = sending.choice === "now";
	const isCleanupEnabled = Boolean(newsletter.cleanup?.enabled);
	const from = newsletter.fromName ? `${newsletter.fromName} <${newsletter.fromEmail}>` : newsletter.fromEmail;

	return (
		<div className="flex flex-col gap-6">
			<CardSettings title="Quem recebe">
				<RowCampaign label="De">
					<span className="truncate text-sm">{from}</span>
				</RowCampaign>
				<RowCampaign label="Para">
					<span className="flex min-w-0 items-center gap-2 text-sm">
						<AvatarNewsletter newsletter={newsletter} size={18} />
						<span className="truncate">
							{newsletter.name}
							<span className="text-muted-foreground tabular-nums"> · {formatCount(audienceCount, "contacto")}</span>
						</span>
					</span>
				</RowCampaign>
				<RowCampaign label="Limite">
					<span className="flex min-w-0 items-center gap-3">
						<input
							type="number"
							min={1}
							inputMode="numeric"
							value={sending.limit}
							onChange={(event) => sending.setLimit(event.target.value)}
							placeholder={`Todos os ${formatNumber(isNow ? sending.issueAudience : audienceCount)}`}
							aria-label="Limite"
							className="h-11 w-full min-w-0 bg-transparent text-sm tabular-nums outline-none placeholder:text-muted-foreground"
						/>
						<span className="shrink-0 text-xs text-muted-foreground">Os mais envolvidos primeiro</span>
					</span>
				</RowCampaign>
				{archiveUrlBase && (
					<RowCampaign label="Página web">
						<InputCampaignSlug
							campaignId={campaign._id}
							initialSlug={campaign.archiveSlug ?? ""}
							placeholder={slugify(subject, 80) || "edicao"}
							urlBase={archiveUrlBase}
						/>
					</RowCampaign>
				)}
				{isCleanupEnabled &&
					(isNow ? (
						<div className="p-3">
							<ListCleanupPreview summary={sending.summary} isCounting={sending.isCounting} error={sending.preview?.error} />
						</div>
					) : (
						<p className="px-4 py-3 text-sm text-pretty text-muted-foreground">
							A limpeza da lista corre no momento do envio, por isso os contactos inativos recebem o email de última oportunidade.
						</p>
					))}
			</CardSettings>

			<CardSettings title="Quando" stagger={1}>
				<div role="radiogroup" aria-label="Quando" className="grid gap-2 p-3 sm:grid-cols-2">
					<CardChoice
						icon={Send}
						title="Enviar já"
						description={scheduledTime ? `Em vez de ${scheduledTime}` : "É enviada de imediato"}
						isSelected={isNow}
						onSelect={() => sending.setChoice("now")}
					/>
					<CardChoice
						icon={CalendarClock}
						title="Agendar"
						description={scheduledTime ? `Agendada para ${scheduledTime}` : "Escolhe um dia e uma hora"}
						isSelected={!isNow}
						onSelect={() => sending.setChoice("later")}
					/>
				</div>
				{!isNow && sending.sendAt && (
					<div className="flex flex-col gap-4 px-4 py-4">
						<PickerSendTime
							value={sending.sendAt}
							onChange={sending.setSendAt}
							suggestions={sending.suggestions}
							history={sending.history}
						/>
						<SummarySendTime value={sending.sendAt} problem={sending.scheduleProblem} />
						<div className="flex items-center justify-between gap-3">
							<p className="text-sm text-muted-foreground tabular-nums">
								Vai para {formatCount(sending.scheduleRecipients, "contacto")}. Podes continuar a editar até lá.
							</p>
							{scheduledAt && (
								<Button variant="ghost" size="sm" onClick={sending.unschedule} disabled={sending.isPending}>
									Desagendar
								</Button>
							)}
						</div>
					</div>
				)}
				{newContacts > FIRST_SEND.minSlice && (
					<div className="flex flex-col gap-2 p-3">
						<NoticeFirstSend count={newContacts} />
					</div>
				)}
			</CardSettings>

			<Dialog open={sending.isConfirmOpen} onOpenChange={sending.setIsConfirmOpen}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle className="tabular-nums">Enviar para {formatCount(sending.sendRecipients, "contacto")}?</DialogTitle>
						<DialogDescription>
							{scheduledTime ? `É enviada agora em vez de ${scheduledTime}.` : "Os contactos mais envolvidos recebem-na primeiro."}
							{sending.sendRecipients < sending.issueAudience && " Podes enviá-la a mais pessoas depois, na página da campanha."}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancelar</Button>
						</DialogClose>
						<Button onClick={sending.send} disabled={sending.isPending} className="min-w-20">
							{sending.isPending ? <Loader2 className="animate-spin" /> : "Enviar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function CardChoice({ icon: Icon, title, description, isSelected, onSelect }) {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={isSelected}
			onClick={onSelect}
			className={cn(
				"flex items-start gap-3 rounded-lg p-3 text-left outline-none transition-[background-color,box-shadow,scale] duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.99]",
				isSelected ? "bg-muted/60 shadow-[inset_0_0_0_1.5px_var(--foreground)]" : "shadow-border hover:bg-muted/60"
			)}
		>
			<span
				aria-hidden="true"
				className={cn(
					"mt-0.5 grid size-4 shrink-0 place-items-center rounded-full transition-colors duration-150",
					isSelected ? "bg-foreground" : "shadow-border"
				)}
			>
				{isSelected && <span className="size-1.5 rounded-full bg-background" />}
			</span>
			<span className="min-w-0">
				<span className="flex items-center gap-1.5 text-sm font-medium">
					<Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
					{title}
				</span>
				<span className="block text-sm text-pretty text-muted-foreground tabular-nums">{description}</span>
			</span>
		</button>
	);
}

function SummarySendTime({ value, problem }) {
	if (problem) return <p className="text-sm text-destructive">{problem}</p>;

	const zone = new Intl.DateTimeFormat(LOCALE, { timeZoneName: "short" })
		.formatToParts(value)
		.find(({ type }) => type === "timeZoneName")?.value;

	return (
		<p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm tabular-nums">
			<span className="font-medium">{formatSendTime(value)}</span>{" "}
			<span className="text-muted-foreground">{zone}</span>
		</p>
	);
}
