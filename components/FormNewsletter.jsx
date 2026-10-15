"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { Check, ExternalLink, FlaskConical, Loader2, X } from "lucide-react";
import { checkSlug, saveNewsletter, sendWelcomeTest } from "@/app/(app)/newsletters/actions";
import BarSave from "@/components/BarSave";
import ButtonCopy from "@/components/ButtonCopy";
import InputImage from "@/components/InputImage";
import PreviewEmail from "@/components/PreviewEmail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CLEANUP_LIMITS, LAST_CHANCE_DAYS, getCleanupSettings } from "@/lib/cleanup";
import { CONFIRM_URL_PLACEHOLDER } from "@/lib/confirmation-content";
import { formatNumber } from "@/lib/format";
import { KEEP_URL_PLACEHOLDER, getLastChanceContent } from "@/lib/last-chance-content";
import {
	getDraftConfirmation,
	getDraftFromEmail,
	getDraftKey,
	getNewsletterDraft,
	getSlugChanges,
	getWebsiteAddress,
} from "@/lib/newsletter-form";
import { getSlugFormatProblem } from "@/lib/newsletter-settings";
import { MAX_AUTHOR_BIO_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/lib/newsletters";
import { UNSUBSCRIBE_PLACEHOLDER, renderEmail } from "@/lib/render-email";
import { getSharedAddress } from "@/lib/sender-rules";
import { slugify } from "@/lib/slug";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { prefillWelcome } from "@/lib/welcome-content";

const IMAGE_PREVIEW_PATTERN = /^(https:\/\/\S+\.\S{2,}\/\S+|\/\S+\.\w{3,4})$/;

// It saves from onSubmit, not a form action: React resets a form after its action, which turned the switches back to how the page
// opened and dropped what an error refused. Discard goes back to what the newsletter has saved.
// The editor's checks link to the postal address field with #postal-address. hasArchiveHost: the server hosts websites on customers' own subdomains.
export default function FormNewsletter({
	newsletter,
	domains,
	sharedDomain,
	appUrl,
	hasArchiveHost,
	isSendingEnabled,
	testEmail,
	cleanupTotals,
}) {
	const slugId = useId();
	const postalAddressRef = useRef(null);
	const [draft, setDraft] = useState(() => getNewsletterDraft({ newsletter, domains, sharedDomain }));
	const draftKey = getDraftKey(draft, { newsletter, sharedDomain });
	const [savedKey, setSavedKey] = useState(draftKey);
	const [savedAt, setSavedAt] = useState(null);
	// The image inputs keep their own URL: a discard starts them over.
	const [discardCount, setDiscardCount] = useState(0);
	const [isSaving, startSaving] = useTransition();
	const [isTesting, startTesting] = useTransition();
	const { name, description, slug, fromName, fromLocal, fromDomain, imageUrl, postalAddress, isConfirmationRequired, confirmationEdits, isWelcomeEnabled, welcome, isArchiveEnabled, isCleanupEnabled, cleanup } = draft;
	const savedCleanup = getCleanupSettings(newsletter);
	const deferredWelcome = useDeferredValue(welcome);
	const deferredPostalAddress = useDeferredValue(postalAddress);
	const sharedAddress = sharedDomain ? getSharedAddress(slug || "slug", sharedDomain) : null;
	const fromEmail = getDraftFromEmail(draft, sharedDomain);
	const isDirty = draftKey !== savedKey;
	const savedSlug = newsletter?.slug ?? "";
	const archiveHost = newsletter?.archiveHost;
	const websiteAddress = getWebsiteAddress({ slug: savedSlug || slug || "slug", archiveHost }, { sharedDomain, appUrl });
	const slugCheck = useSlugCheck({ slug, savedSlug, newsletterId: newsletter?._id });

	useEffect(() => {
		if (window.location.hash === `#${POSTAL_ADDRESS_ID}`) postalAddressRef.current?.focus();
	}, []);

	const welcomeHtml = useMemo(
		() =>
			renderEmail({
				markdown: deferredWelcome.markdown,
				subject: deferredWelcome.subject,
				previewText: deferredWelcome.previewText,
				newsletter: { name, postalAddress: deferredPostalAddress },
			}).html.replaceAll(UNSUBSCRIBE_PLACEHOLDER, "#"),
		[deferredWelcome, name, deferredPostalAddress]
	);

	const confirmation = useMemo(
		() => getDraftConfirmation({ name, description, confirmationEdits }, newsletter),
		[name, description, confirmationEdits, newsletter]
	);
	const deferredConfirmation = useDeferredValue(confirmation);
	const confirmationHtml = useMemo(
		() =>
			renderEmail({ ...deferredConfirmation, newsletter: { name, postalAddress: deferredPostalAddress } })
				.html.replaceAll(UNSUBSCRIBE_PLACEHOLDER, "#")
				.replaceAll(CONFIRM_URL_PLACEHOLDER, "#"),
		[deferredConfirmation, name, deferredPostalAddress]
	);

	const lastChance = useMemo(() => {
		const content = getLastChanceContent({ name, fromEmail });
		const { html } = renderEmail({ ...content, newsletter: { name, postalAddress: deferredPostalAddress } });
		return {
			...content,
			html: html.replaceAll(UNSUBSCRIBE_PLACEHOLDER, "#").replaceAll(KEEP_URL_PLACEHOLDER, "#"),
		};
	}, [name, fromEmail, deferredPostalAddress]);

	const previewImageUrl = IMAGE_PREVIEW_PATTERN.test(imageUrl) ? imageUrl : "";
	const isShared = Boolean(sharedDomain) && fromDomain === sharedDomain;
	const isDomainUnverified = !isShared && domains.some(({ domain, verified }) => domain === fromDomain && !verified);
	const fromHint = getFromHint({ isShared, isDomainUnverified, fromDomain, hasDomains: domains.length > 0 });

	function set(key, value) {
		setDraft((current) => ({ ...current, [key]: value }));
	}

	function update(key) {
		return (event) => set(key, event.target.value);
	}

	function updateConfirmation(key) {
		return (event) => {
			const { value } = event.target;
			setDraft((current) => ({ ...current, confirmationEdits: { ...(current.confirmationEdits ?? confirmation), [key]: value } }));
		};
	}

	function updateWelcome(key) {
		return (event) => {
			const { value } = event.target;
			setDraft((current) => ({ ...current, welcome: { ...current.welcome, [key]: value } }));
		};
	}

	function switchWelcome(isEnabled) {
		setDraft((current) => ({
			...current,
			isWelcomeEnabled: isEnabled,
			welcome: isEnabled ? prefillWelcome(current.welcome, { name: current.name, description: current.description }) : current.welcome,
		}));
	}

	function updateCleanup(key) {
		return (event) => {
			const { value } = event.target;
			setDraft((current) => ({ ...current, cleanup: { ...current.cleanup, [key]: value } }));
		};
	}

	function save(event) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		startSaving(async () => {
			const result = await saveNewsletter(null, formData);
			if (result?.error) return void toast.error(result.error);
			setSavedKey(draftKey);
			setSavedAt(result.savedAt);
		});
	}

	function discard() {
		const saved = getNewsletterDraft({ newsletter, domains, sharedDomain });
		setDraft(saved);
		setSavedKey(getDraftKey(saved, { newsletter, sharedDomain }));
		setSavedAt(null);
		setDiscardCount((count) => count + 1);
	}

	function sendTest() {
		startTesting(async () => {
			const result = await sendWelcomeTest(newsletter._id);
			if (result?.error) toast.error(result.error);
			else toast.success(`Teste enviado para ${testEmail}`);
		});
	}

	return (
		<form onSubmit={save} className="flex flex-col gap-4">
			{newsletter && <input type="hidden" name="id" value={newsletter._id} />}

			<Section title="Geral" stagger={0}>
				<Field label="Nome">
					<Input
						name="name"
						value={name}
						required
						placeholder="Notas de campo"
						onChange={(event) => {
							const { value } = event.target;
							setDraft((current) => ({ ...current, name: value, ...(!current.isSlugEdited && { slug: slugify(value) }) }));
						}}
					/>
				</Field>
				<Field label="Slug" htmlFor={slugId}>
					<span className="relative flex">
						<Input
							id={slugId}
							name="slug"
							value={slug}
							required
							placeholder="notas-de-campo"
							aria-invalid={slugCheck.message ? true : undefined}
							aria-describedby={slugCheck.status === "saved" ? undefined : `${slugId}-check`}
							className="pr-9 font-mono"
							onChange={(event) => {
								const { value } = event.target;
								setDraft((current) => ({ ...current, slug: value, isSlugEdited: true }));
							}}
						/>
						<IconSlugCheck status={slugCheck.status} />
					</span>
					{slugCheck.status !== "saved" && (
						<span id={`${slugId}-check`} className="flex flex-col gap-2">
							<span aria-live="polite" className={cn("text-xs", slugCheck.message ? "text-red-600 dark:text-red-400" : "sr-only")}>
								{slugCheck.message ?? (slugCheck.status === "available" ? `${slug.trim().toLowerCase()} is available` : "")}
							</span>
							{newsletter && (
								<ListSlugChanges
									changes={getSlugChanges({
										slug: slug.trim().toLowerCase(),
										savedSlug,
										archiveHost,
										isShared,
										sharedDomain,
										appUrl,
									})}
								/>
							)}
						</span>
					)}
				</Field>
				<Field label="Imagem" hint="Logótipo quadrado, 128×128 ou maior">
					<InputImage
						key={discardCount}
						name="imageUrl"
						defaultValue={imageUrl}
						label="imagem da newsletter"
						onChange={(value) => set("imageUrl", value)}
					/>
				</Field>
			</Section>

			<Section title="Remetente" stagger={1}>
				<Field label="Nome do remetente">
					<Input name="fromName" value={fromName} placeholder="Joana Silva" onChange={update("fromName")} />
				</Field>
				<Field label="Email do remetente" hint={fromHint} isWarning={isDomainUnverified}>
					<span className="flex flex-wrap items-center gap-2">
						<span className="flex items-center gap-2">
							<Input
								value={isShared ? sharedAddress.split("@")[0] : fromLocal}
								readOnly={isShared}
								required
								aria-label="Nome do email do remetente"
								placeholder="ola"
								className={cn("w-32 font-mono", isShared && "text-muted-foreground")}
								onChange={(event) => set("fromLocal", event.target.value.trim())}
							/>
							<span className="text-sm text-muted-foreground">@</span>
						</span>
						{/* The shared domain has the slug in it, so it can be wider than the column. */}
						<Select value={fromDomain} onValueChange={(value) => set("fromDomain", value)}>
							<SelectTrigger
								className="min-h-9 min-w-0 flex-auto py-1.5 text-left font-mono whitespace-normal wrap-anywhere data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none"
								aria-label="Domínio do remetente"
							>
								<SelectValue placeholder="Adiciona primeiro um domínio" />
							</SelectTrigger>
							<SelectContent className="max-w-[calc(100vw-20px)] wrap-anywhere">
								{sharedDomain && <SelectItem value={sharedDomain}>{sharedAddress.split("@")[1]}</SelectItem>}
								{domains.map(({ domain }) => (
									<SelectItem key={domain} value={domain}>
										{domain}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</span>
					<input type="hidden" name="fromEmail" value={fromEmail} />
				</Field>
				<Field label="Responder para">
					<Input name="replyTo" type="email" value={draft.replyTo} placeholder="Opcional" onChange={update("replyTo")} />
				</Field>
				<Field
					label="Morada postal"
					htmlFor={POSTAL_ADDRESS_ID}
					hint={
						postalAddress.trim()
							? "Aparece no rodapé de todos os emails. As leis anti-spam exigem uma."
							: "Aparece no rodapé de todos os emails. As leis anti-spam exigem uma, por isso o envio espera por ela."
					}
				>
					<Textarea
						ref={postalAddressRef}
						id={POSTAL_ADDRESS_ID}
						name="postalAddress"
						value={postalAddress}
						rows={2}
						placeholder="Nome da empresa, rua, cidade, país"
						className="scroll-mt-28"
						onChange={update("postalAddress")}
					/>
				</Field>
			</Section>

			<Section
				title="Confirmar novas inscrições"
				stagger={2}
				action={
					<Switch
						name="requireConfirmation"
						checked={isConfirmationRequired}
						onCheckedChange={(isChecked) => set("isConfirmationRequired", isChecked)}
						aria-label="Confirmar novas inscrições"
					/>
				}
			>
				<p className="px-4 py-3 text-sm text-pretty text-muted-foreground">
					Os novos subscritores recebem este email e só entram depois de clicarem no botão, por isso endereços falsos ou mal
					escritos nunca chegam à lista. É o único email que recebem: diz o que vem a seguir.
				</p>
				{isConfirmationRequired && (
					<>
						<Field label="Assunto">
							<Input
								name="confirmationSubject"
								value={confirmation.subject}
								required
								onChange={updateConfirmation("subject")}
							/>
						</Field>
						<Field label="Texto de pré-visualização">
							<Input
								name="confirmationPreviewText"
								value={confirmation.previewText}
								placeholder="Optional"
								onChange={updateConfirmation("previewText")}
							/>
						</Field>
						<Field
							label="Conteúdo"
							hint={`Markdown. Mantém o botão: o seu ${CONFIRM_URL_PLACEHOLDER} torna-se o link de cada subscritor.`}
						>
							<Textarea
								name="confirmationMarkdown"
								value={confirmation.markdown}
								onChange={updateConfirmation("markdown")}
								className="min-h-48 font-mono text-[13px] leading-6"
							/>
						</Field>
						<div className="p-3">
							<PreviewEmail
								html={confirmationHtml}
								sender={{ name, fromName, fromEmail, imageUrl: previewImageUrl }}
								subject={deferredConfirmation.subject}
								previewText={deferredConfirmation.previewText}
								fit="content"
							/>
						</div>
					</>
				)}
			</Section>

			<Section
				title="Email de boas-vindas"
				stagger={3}
				collapsedNote={
					isConfirmationRequired &&
					"Não é enviado enquanto as novas inscrições tiverem de ser confirmadas, porque o email de confirmação o substitui. O conteúdo fica guardado."
				}
				action={
					<Switch
						name="welcomeEnabled"
						checked={isWelcomeEnabled}
						onCheckedChange={switchWelcome}
						aria-label="Email de boas-vindas"
					/>
				}
			>
				<Field label="Assunto">
					<Input name="welcomeSubject" value={welcome.subject} onChange={updateWelcome("subject")} />
				</Field>
				<Field label="Texto de pré-visualização">
					<Input
						name="welcomePreviewText"
						value={welcome.previewText}
						placeholder="Optional"
						onChange={updateWelcome("previewText")}
					/>
				</Field>
				<Field label="Conteúdo" hint="Markdown">
					<Textarea
						name="welcomeMarkdown"
						value={welcome.markdown}
						onChange={updateWelcome("markdown")}
						className="min-h-48 font-mono text-[13px] leading-6"
					/>
				</Field>
				{deferredWelcome.markdown.trim() && (
					<div className="p-3">
						<PreviewEmail
							html={welcomeHtml}
							sender={{ name, fromName, fromEmail, imageUrl: previewImageUrl }}
							subject={deferredWelcome.subject}
							previewText={deferredWelcome.previewText}
							fit="content"
						/>
					</div>
				)}
				{newsletter && (
					<div className="flex items-center justify-between gap-3 px-4 py-3">
						<p className="text-xs wrap-anywhere text-muted-foreground">
							{isSendingEnabled ? `Envia a versão guardada para ${testEmail}` : "O envio está desligado"}
						</p>
						<Button type="button" variant="outline" size="sm" onClick={sendTest} disabled={!isSendingEnabled || isTesting}>
							{isTesting ? <Loader2 className="animate-spin" /> : <FlaskConical />}
							Enviar teste
						</Button>
					</div>
				)}
			</Section>

			<Section
				title="Limpeza da lista"
				stagger={4}
				action={
					<Switch
						name="cleanupEnabled"
						checked={isCleanupEnabled}
						onCheckedChange={(isChecked) => set("isCleanupEnabled", isChecked)}
						aria-label="Limpeza da lista"
					/>
				}
			>
				<p className="px-4 py-3 text-sm text-pretty text-muted-foreground">
					Deixa de enviar para os contactos que deixaram de abrir, a não ser que respondam a um email de última oportunidade.
					Sempre que envias uma edição, os contactos que ignoraram as últimas {cleanup.issues || savedCleanup.issues} edições e
					não deram sinal de vida há {cleanup.days || savedCleanup.days} dias recebem este email em vez dela. Um clique no
					botão mantém-nos. Quem não responder até um envio {LAST_CHANCE_DAYS} dias depois fica inativo: não cancela a
					subscrição, não é eliminado, e volta se se inscrever de novo.
				</p>
				<Field label="Edições ignoradas" hint="Seguidas, a contar da primeira edição que o ImpactMail enviou">
					<Input
						name="cleanupIssues"
						type="number"
						inputMode="numeric"
						min={CLEANUP_LIMITS.minIssues}
						max={CLEANUP_LIMITS.maxIssues}
						value={cleanup.issues}
						onChange={updateCleanup("issues")}
						className="w-28 tabular-nums"
					/>
				</Field>
				<Field label="Sem atividade há" hint="Dias desde a última abertura, clique ou inscrição">
					<span className="flex items-center gap-2">
						<Input
							name="cleanupDays"
							type="number"
							inputMode="numeric"
							min={CLEANUP_LIMITS.minDays}
							max={CLEANUP_LIMITS.maxDays}
							value={cleanup.days}
							onChange={updateCleanup("days")}
							className="w-28 tabular-nums"
						/>
						<span className="text-sm text-muted-foreground">dias</span>
					</span>
				</Field>
				{cleanupTotals && <CleanupTotals totals={cleanupTotals} />}
				{isCleanupEnabled && (
					<div className="p-3">
						<PreviewEmail
							html={lastChance.html}
							sender={{ name, fromName, fromEmail, imageUrl: previewImageUrl }}
							subject={lastChance.subject}
							previewText={lastChance.previewText}
							fit="content"
						/>
					</div>
				)}
			</Section>

			<Section
				title="Site"
				stagger={5}
				action={
					<Switch
						name="archiveEnabled"
						checked={isArchiveEnabled}
						onCheckedChange={(isChecked) => set("isArchiveEnabled", isChecked)}
						aria-label="Site"
					/>
				}
			>
				<p className="px-4 py-3 text-sm text-pretty text-muted-foreground">
					Cada edição que envias ganha aqui uma página, com um formulário de inscrição.
					{hasArchiveHost && !archiveHost && " Adiciona um domínio na página Domínios para o pores no teu próprio subdomínio."}
				</p>
				<Field
					label="Endereço"
					as="div"
					hint={
						!isArchiveEnabled ? (
							"O teu site está desligado. Liga-o acima para dar uma página a cada edição que envias."
						) : !newsletter?.archiveEnabled ? (
							"Fica online quando guardares."
						) : null
					}
				>
					<span className="flex min-w-0 items-center gap-1.5 sm:min-h-9">
						{isArchiveEnabled && newsletter?.archiveEnabled ? (
							<a
								href={websiteAddress}
								target="_blank"
								rel="noreferrer"
								className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[13px] underline decoration-foreground/30 underline-offset-4 transition-colors duration-150 hover:decoration-foreground"
							>
								<span className="truncate">{websiteAddress}</span>
								<ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
							</a>
						) : (
							<span className="truncate font-mono text-[13px] text-muted-foreground/70">{websiteAddress}</span>
						)}
						<ButtonCopy value={websiteAddress} label="Copiar endereço" />
					</span>
				</Field>
				<Field label="Descrição" hint="Uma frase por baixo do nome e na janela de inscrição">
					<Textarea
						name="description"
						value={description}
						rows={2}
						maxLength={MAX_DESCRIPTION_LENGTH}
						placeholder="Uma ideia sobre construir coisas, todos os domingos."
						onChange={update("description")}
					/>
				</Field>
				<Field label="Biografia do autor" hint="Por baixo do teu nome na página do autor">
					<Input
						name="authorBio"
						value={draft.authorBio}
						maxLength={MAX_AUTHOR_BIO_LENGTH}
						placeholder="Escrevo sobre como criar pequenas empresas de software."
						onChange={update("authorBio")}
					/>
				</Field>
				<Field label="Foto do autor" hint="Foto quadrada na página do autor. Senão, a imagem da newsletter.">
					<InputImage
						key={discardCount}
						name="authorImageUrl"
						defaultValue={draft.authorImageUrl}
						label="foto do autor"
						onChange={(value) => set("authorImageUrl", value)}
					/>
				</Field>
				<Field label="Redes sociais" hint="Um link por linha">
					<Textarea
						name="socialLinks"
						value={draft.socialLinks}
						rows={3}
						placeholder={"https://x.com/example\nhttps://youtube.com/@example"}
						className="font-mono text-[13px] leading-6"
						onChange={update("socialLinks")}
					/>
				</Field>
			</Section>

			<BarSave isDirty={isDirty} isSaving={isSaving} savedAt={savedAt} onDiscard={discard} label={newsletter ? "Guardar" : "Criar"} />
		</form>
	);
}

// With a collapsedNote, the note stands in for the action and the fields, which aren't sent with the form.
function Section({ title, action, stagger, collapsedNote, children }) {
	return (
		<section style={{ "--stagger": stagger }} className="rounded-xl bg-card shadow-border animate-enter">
			<div className="flex h-12 items-center justify-between gap-3 px-4">
				<h2 className="text-sm font-medium">{title}</h2>
				{!collapsedNote && action}
			</div>
			{collapsedNote ? (
				<p className="border-t border-border/60 px-4 py-3 text-sm text-pretty text-muted-foreground">
					{collapsedNote}
				</p>
			) : (
				children && <div className="divide-y divide-border/60 border-t border-border/60">{children}</div>
			)}
		</section>
	);
}

function CleanupTotals({ totals }) {
	const stats = [
		{ label: "À espera de resposta", value: totals.waiting },
		{ label: "Mantidos depois do email", value: totals.kept },
		{ label: "Tornados inativos", value: totals.dormant },
	];
	return (
		<dl className="grid grid-cols-3 divide-x divide-border/60">
			{stats.map(({ label, value }) => (
				<div key={label} className="flex flex-col gap-1 px-4 py-3">
					<dt className="text-xs text-pretty text-muted-foreground">{label}</dt>
					<dd className="text-lg font-semibold tabular-nums">{formatNumber(value)}</dd>
				</div>
			))}
		</dl>
	);
}

function getFromHint({ isShared, isDomainUnverified, fromDomain, hasDomains }) {
	if (isShared) return "O endereço partilhado segue o slug e não precisa de configuração. As respostas vão para o endereço de resposta, ou para o email da tua conta.";
	if (isDomainUnverified) return `${fromDomain} ainda não está verificado. Os emails esperam até os registos DNS estarem no sítio.`;
	if (!fromDomain && !hasDomains) return "Adiciona um domínio na página Domínios para enviares a partir dele";
	return null;
}

// The whole row is the field's label, unless it holds more than the field (buttons, a list): then only its name is,
// for htmlFor, and as="div" has no field to name.
function Field({ label, hint, isWarning, htmlFor, as, children }) {
	const Row = htmlFor || as === "div" ? "div" : "label";
	const Name = htmlFor ? "label" : "span";
	return (
		<Row className="grid gap-2 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
			<Name htmlFor={htmlFor} className="text-sm text-muted-foreground sm:pt-2">
				{label}
			</Name>
			<span className="flex min-w-0 flex-col gap-1.5">
				{children}
				{hint && (
					<span
						className={cn(
							"text-xs",
							isWarning ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
						)}
					>
						{hint}
					</span>
				)}
			</span>
		</Row>
	);
}

// Inside the slug field, at its end: a spinner while it's checked, then whether it's free.
function IconSlugCheck({ status }) {
	if (status === "saved") return null;
	const Icon = status === "checking" ? Loader2 : status === "available" ? Check : X;
	return (
		<Icon
			key={status}
			aria-hidden="true"
			className={cn(
				"pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2",
				status === "checking" ? "animate-spin text-muted-foreground" : "animate-icon-in",
				status === "available" && "text-emerald-600 dark:text-emerald-400",
				(status === "unavailable" || status === "error") && "text-red-600 dark:text-red-400"
			)}
		/>
	);
}

function ListSlugChanges({ changes }) {
	return (
		<span className="flex flex-col gap-1.5 rounded-lg bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground animate-enter">
			<span className="font-medium text-foreground">Ao mudar o slug</span>
			<ul className="flex list-disc flex-col gap-1 pl-4 text-pretty marker:text-muted-foreground/60">
				{changes.map((change) => (
					<li key={change}>{change}</li>
				))}
			</ul>
		</span>
	);
}

// While the slug isn't the saved one, it's checked once typing pauses: its format here, then on the server whether
// another newsletter has it. An answer counts for the slug it was asked for.
function useSlugCheck({ slug, savedSlug, newsletterId }) {
	const value = slug.trim().toLowerCase();
	const isChanged = Boolean(value) && value !== savedSlug;
	const [answer, setAnswer] = useState(null);

	useEffect(() => {
		if (!isChanged) return;
		let isCurrent = true;
		const timeout = setTimeout(async () => {
			const problem = getSlugFormatProblem(value);
			const result = problem
				? { available: false, ...problem }
				: await checkSlug(value, newsletterId).catch(() => ({ error: "Não foi possível verificar o slug. Ao guardar, é verificado de novo." }));
			if (isCurrent) setAnswer({ slug: value, ...result });
		}, SLUG_CHECK_DELAY_MS);
		return () => {
			isCurrent = false;
			clearTimeout(timeout);
		};
	}, [value, isChanged, newsletterId]);

	if (!isChanged) return { status: "saved" };
	if (answer?.slug !== value) return { status: "checking" };
	if (answer.error) return { status: "error", message: answer.error };
	return answer.available ? { status: "available" } : { status: "unavailable", message: answer.message };
}

const POSTAL_ADDRESS_ID = "postal-address";
const SLUG_CHECK_DELAY_MS = 350;
