import { rootDomain } from "@/lib/root-domain";

// The DNS records a customer adds for one domain, grouped by what each does, with its status in words.
const SES_STATUSES = {
	SUCCESS: { label: "Encontrado", tone: "good" },
	PENDING: { label: "À espera do DNS", tone: "wait" },
	TEMPORARY_FAILURE: { label: "A tentar de novo", tone: "wait" },
	FAILED: { label: "Não encontrado, verifica os registos", tone: "bad" },
	NOT_STARTED: { label: "Não configurado", tone: "none" },
};

function sesStatus(status) {
	return SES_STATUSES[status] ?? SES_STATUSES.PENDING;
}

const DMARC_STATUSES = {
	found: { label: "Encontrado", tone: "good" },
	multiple: { label: "Mais do que um registo, mantém só um", tone: "bad" },
	invalid: { label: "Inválido, verifica o registo", tone: "bad" },
};

// A parent domain's record covers the domain too.
function dmarcStatus({ domain, dmarc }) {
	const status = DMARC_STATUSES[dmarc?.status] ?? { label: "Recomendado", tone: "none" };
	return dmarc?.status === "found" && dmarc.host !== domain ? { ...status, label: `Encontrado em ${dmarc.host}` } : status;
}

const COUNTS = { 1: "Um", 2: "Dois", 3: "Três" };

// SES signs with three CNAMEs, PostShiba with one.
function describeRecords(records) {
	const types = [...new Set(records.map(({ type }) => type))];
	if (!COUNTS[records.length] || types.length !== 1) return "";
	return ` ${COUNTS[records.length]} registo${records.length === 1 ? "" : "s"} ${types[0]}.`;
}

// A record's name as most DNS providers ask for it: they add the zone themselves, and take @ for the zone itself.
export function getDnsHost(name, zone) {
	const host = String(name ?? "")
		.toLowerCase()
		.replace(/\.$/, "");
	if (host === zone) return "@";
	return host.endsWith(`.${zone}`) ? host.slice(0, -zone.length - 1) : host;
}

// Statuses come in SES's words; the PostShiba adapter maps its own to them (lib/email-provider/postshiba-rules.js).
// Without an archive target the server doesn't host archives on customers' domains, so there's no archive step.
export function getDomainSetup(domain, { cnameTarget }) {
	const zone = rootDomain(domain.domain);
	const withHost = (record) => ({ ...record, host: getDnsHost(record.name, zone) });
	const records = (domain.records ?? []).map(withHost);
	const dkim = records.filter(({ purpose }) => purpose === "dkim");
	return [
		{
			key: "dkim",
			title: "Assinatura (DKIM)",
			description: `Prova que os emails vêm de ti.${describeRecords(dkim)}`,
			status: sesStatus(domain.dkimStatus),
			records: dkim,
		},
		{
			key: "mail-from",
			title: "Caminho de retorno",
			description: `As devoluções voltam para ${domain.mailFromDomain}, por isso o SPF passa para o teu domínio.`,
			status: sesStatus(domain.mailFromStatus),
			records: records.filter(({ purpose }) => purpose === "mail-from"),
		},
		...(cnameTarget
			? [
					{
						key: "archive",
						title: "Site e links",
						description: `O teu site, os links rastreados e os links para cancelar a subscrição em ${domain.archiveHost}.`,
						status: domain.archiveHostVerified ? { label: "Encontrado", tone: "good" } : { label: "À espera do DNS", tone: "wait" },
						records: [withHost({ type: "CNAME", name: domain.archiveHost, value: cnameTarget })],
					},
				]
			: []),
		{
			key: "dmarc",
			title: "DMARC",
			description:
				"Diz às caixas de correio o que fazer com os emails que falham as verificações. O Gmail e o Yahoo exigem-no a quem envia em massa. Começa com p=none e passa para p=quarantine quando os relatórios estiverem limpos.",
			status: dmarcStatus(domain),
			records: [withHost({ type: "TXT", name: `_dmarc.${domain.domain}`, value: "v=DMARC1; p=none;" })],
		},
	];
}

// What a domain can do right now, in a few words.
export function getDomainSummary(domain, { cnameTarget }) {
	if (domain.verified && (domain.archiveHostVerified || !cnameTarget)) return { label: "Pronto", tone: "good" };
	if (domain.verified) return { label: "Envio pronto, site à espera", tone: "wait" };
	if (domain.dkimStatus === "FAILED") return { label: "Registos não encontrados", tone: "bad" };
	return { label: "À espera do DNS", tone: "wait" };
}
