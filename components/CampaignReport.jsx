import { Copy, ExternalLink, Globe, Pause, Pin, PinOff, Play } from "lucide-react";
import {
	duplicateCampaign,
	pauseCampaign,
	resumeCampaign,
	toggleArchivePin,
} from "@/app/(app)/campaigns/actions";
import AvatarNewsletter from "@/components/AvatarNewsletter";
import BadgeStatus from "@/components/BadgeStatus";
import ButtonCampaignAction from "@/components/ButtonCampaignAction";
import ButtonCopy from "@/components/ButtonCopy";
import CardStat from "@/components/CardStat";
import DialogSendMore from "@/components/DialogSendMore";
import HeaderPage from "@/components/HeaderPage";
import ImageFavicon from "@/components/ImageFavicon";
import InputCampaignSlug from "@/components/InputCampaignSlug";
import PreviewEmail from "@/components/PreviewEmail";
import TextEmpty from "@/components/TextEmpty";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getArchiveUrls } from "@/lib/archive-hosts";
import { FIRST_SEND, LIMITS, isSendingEnabled } from "@/lib/config";
import { formatDate, formatNumber, formatRate } from "@/lib/format";
import { rateTone } from "@/lib/health";
import { PROVIDER_DOMAINS, PROVIDER_LABELS } from "@/lib/providers";
import { UNSUBSCRIBE_PLACEHOLDER, renderEmail, withResponsiveImages } from "@/lib/render-email";

export default function CampaignReport({
	campaign,
	newsletter,
	providers,
	remainingCount = 0,
	isBlocked = false,
	newContacts = 0,
}) {
	const { stats } = campaign;
	const id = campaign._id.toString();
	const isOnArchive = newsletter.archiveEnabled && Boolean(campaign.archiveSlug) && campaign.archiveListed !== false;
	const reached = stats.delivered || stats.sent;
	const progress = stats.recipients ? Math.min(stats.sent / stats.recipients, 1) : 0;
	const { html } = renderEmail({
		format: campaign.format,
		markdown: campaign.markdown,
		html: campaign.html,
		subject: campaign.subject,
		previewText: campaign.previewText,
		newsletter,
	});

	return (
		<>
			<HeaderPage
				title={campaign.subject || "Sem título"}
				backHref="/campaigns"
				icon={<AvatarNewsletter newsletter={newsletter} size={28} />}
				meta={<BadgeStatus status={campaign.status} />}
			>
				{campaign.status === "sent" && remainingCount > 0 && isSendingEnabled() && !isBlocked && (
					<DialogSendMore
						campaignId={id}
						sentCount={stats.recipients}
						remainingCount={remainingCount}
						isCleanupEnabled={Boolean(newsletter.cleanup?.enabled)}
						newContacts={newContacts}
					/>
				)}
				{campaign.status === "sending" && (
					<ButtonCampaignAction action={pauseCampaign} id={id}>
						<Pause data-icon="inline-start" />
						Pausar
					</ButtonCampaignAction>
				)}
				{campaign.status === "paused" && (
					<ButtonCampaignAction
						action={resumeCampaign}
						id={id}
						disabledReason={isBlocked ? "A conta está bloqueada" : isSendingEnabled() ? null : "O envio está desligado"}
					>
						<Play data-icon="inline-start" />
						Retomar
					</ButtonCampaignAction>
				)}
				{isOnArchive && (
					<>
						<Button variant="outline" asChild>
							<a href={getArchiveUrls(newsletter).post(campaign.archiveSlug)} target="_blank" rel="noreferrer">
								<ExternalLink data-icon="inline-start" />
								Ver página
							</a>
						</Button>
						<ButtonCampaignAction action={toggleArchivePin} id={id}>
							{campaign.archivePinned ? <PinOff data-icon="inline-start" /> : <Pin data-icon="inline-start" />}
							{campaign.archivePinned ? "Desafixar" : "Afixar"}
						</ButtonCampaignAction>
					</>
				)}
				<ButtonCampaignAction action={duplicateCampaign} id={id}>
					<Copy data-icon="inline-start" />
					Duplicar
				</ButtonCampaignAction>
			</HeaderPage>

			<div className="flex flex-col gap-6">
				{campaign.status === "paused" && campaign.pauseReason && (
					<TextPauseReason reason={campaign.pauseReason} />
				)}
				{["sending", "paused"].includes(campaign.status) && (
					<div className="flex flex-col gap-2 animate-enter">
						<div className="flex justify-between text-sm tabular-nums">
							<span className="text-muted-foreground">
								{formatNumber(stats.sent)} de {formatNumber(stats.recipients)}
							</span>
							<span>{Math.round(progress * 100)}%</span>
						</div>
						<div className="h-1.5 overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-foreground transition-[width] duration-500"
								style={{ width: `${progress * 100}%` }}
							/>
						</div>
						{campaign.status === "sending" && campaign.firstSend?.held > 0 && !campaign.firstSend.checkedAt && (
							<p className="text-xs text-pretty text-muted-foreground">
								{formatNumber(campaign.firstSend.slice)} contactos que nunca receberam um email teu vão primeiro. Os outros{" "}
								{formatNumber(campaign.firstSend.held)} seguem {FIRST_SEND.waitMinutes / 60} horas depois, se as devoluções e as denúncias
								se mantiverem baixas. Se não, os restantes esperam que retomes o envio e, se estiverem muito acima, a tua conta é
								bloqueada.
							</p>
						)}
					</div>
				)}

				<div
					style={{ "--stagger": 1 }}
					className="grid grid-cols-2 gap-3 animate-enter sm:grid-cols-3 lg:grid-cols-6"
				>
					<CardStat
						label="Entregues"
						value={formatRate(stats.delivered, stats.sent)}
						detail={formatNumber(stats.delivered)}
					/>
					<CardStat
						label="Abertos"
						value={formatRate(stats.opened, reached)}
						detail={formatNumber(stats.opened)}
					/>
					<CardStat
						label="Clicados"
						value={formatRate(stats.clicked, reached)}
						detail={formatNumber(stats.clicked)}
					/>
					<CardStat
						label="Devolvidos"
						value={formatRate(stats.bounced, stats.sent, 2)}
						detail={formatNumber(stats.bounced)}
						tone={rateTone(stats.bounced, stats.sent, LIMITS.pause.bounceRate)}
					/>
					<CardStat
						label="Denúncias"
						value={formatRate(stats.complained, stats.sent, 3)}
						detail={formatNumber(stats.complained)}
						tone={rateTone(stats.complained, stats.sent, LIMITS.pause.complaintRate)}
					/>
					<CardStat
						label="Saíram"
						value={formatRate(stats.unsubscribed, reached, 2)}
						detail={formatNumber(stats.unsubscribed)}
					/>
				</div>

				{providers.length > 0 && (
					<div
						style={{ "--stagger": 2 }}
						className="overflow-hidden rounded-xl shadow-border animate-enter"
					>
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="pl-4">Caixa de correio</TableHead>
									<TableHead className="text-right">Enviados</TableHead>
									<TableHead className="text-right">Entregues</TableHead>
									<TableHead className="text-right">Abertos</TableHead>
									<TableHead className="hidden text-right sm:table-cell">Clicados</TableHead>
									<TableHead className="hidden text-right sm:table-cell">Devolvidos</TableHead>
									<TableHead className="pr-4 text-right">Denúncias</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{providers.map((row) => (
									<TableRow key={row.provider} className="tabular-nums">
										<TableCell className="pl-4 font-medium">
											<span className="flex items-center gap-2.5">
												{PROVIDER_DOMAINS[row.provider] ? (
													<ImageFavicon domain={PROVIDER_DOMAINS[row.provider]} size={16} />
												) : (
													<Globe className="size-4 text-muted-foreground" />
												)}
												{PROVIDER_LABELS[row.provider] || PROVIDER_LABELS.other}
											</span>
										</TableCell>
										<TableCell className="text-right">{formatNumber(row.sent)}</TableCell>
										<TableCell className="text-right">{formatRate(row.delivered, row.sent) ?? <TextEmpty />}</TableCell>
										<TableCell className="text-right">{formatRate(row.opened, row.delivered) ?? <TextEmpty />}</TableCell>
										<TableCell className="hidden text-right sm:table-cell">
											{formatRate(row.clicked, row.delivered) ?? <TextEmpty />}
										</TableCell>
										<TableCell className="hidden text-right sm:table-cell">
											{formatRate(row.bounced, row.sent, 2) ?? <TextEmpty />}
										</TableCell>
										<TableCell className="pr-4 text-right">
											{formatRate(row.complained, row.sent, 3) ?? <TextEmpty />}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}

				{newsletter.archiveEnabled && campaign.archiveSlug && (
					<div
						style={{ "--stagger": 3 }}
						className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-2 rounded-xl bg-card px-4 shadow-border transition-colors duration-150 animate-enter focus-within:bg-muted/40"
					>
						<span className="text-sm text-muted-foreground">URL</span>
						<InputCampaignSlug
							campaignId={id}
							initialSlug={campaign.archiveSlug}
							urlBase={getArchiveUrls(newsletter).absolutePost("")}
							isPublished
						/>
						<ButtonCopy value={getArchiveUrls(newsletter).absolutePost(campaign.archiveSlug)} label="Copiar link" />
					</div>
				)}

				<div style={{ "--stagger": 4 }} className="animate-enter">
					<PreviewEmail
						fit="content"
						sender={newsletter}
						subject={campaign.subject}
						previewText={campaign.previewText}
						html={withResponsiveImages(html.replaceAll(UNSUBSCRIBE_PLACEHOLDER, "#"))}
						// Rendered next to PreviewEmail's own children, so dev React asks for a key.
						toolbar={
							<span key="toolbar" className="truncate text-xs text-muted-foreground">
								{newsletter.name}
								{campaign.sentAt && ` · ${formatDate(campaign.sentAt)}`}
							</span>
						}
					/>
				</div>
			</div>
		</>
	);
}

function TextPauseReason({ reason }) {
	return (
		<p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-amber-500/10 px-4 py-3 text-sm animate-enter">
			<span className="text-pretty">Em pausa: {reason}</span>
		</p>
	);
}
