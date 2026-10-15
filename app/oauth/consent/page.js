import { redirect } from "next/navigation";
import { AppWindow, ArrowLeftRight, Check } from "lucide-react";
import { switchAccount } from "@/app/oauth/consent/actions";
import ButtonSignout from "@/components/ButtonSignout";
import FormConsent from "@/components/FormConsent";
import LogoImpactmail from "@/components/LogoImpactmail";
import { isDeletionPending } from "@/lib/account-state";
import { getCurrentAccount } from "@/lib/auth";
import { readOAuthRequest } from "@/lib/oauth";
import { isLoopbackRedirect } from "@/lib/oauth-rules";

export const metadata = { title: "Ligar uma app" };

const ACCESS = [
	"Ler e alterar a tua newsletter, campanhas, contactos e domínios",
	"Enviar campanhas aos teus subscritores",
	"Criar e revogar chaves de API",
];

// Better Auth sends people here with the app's signed authorization request when it needs their consent (and
// for prompt=select_account). The app gets the same access as a full access API key.
export default async function ConsentPage({ searchParams }) {
	const oauthRequest = await readOAuthRequest(await searchParams);
	if (!oauthRequest || oauthRequest.isExpired) return <Expired />;
	const current = await getCurrentAccount();
	if (!current) redirect(`/signin?${oauthRequest.query}`);
	if (isDeletionPending(current.account)) redirect("/restore");

	const { client, query, redirectUri, scopes } = oauthRequest;
	const redirectHost = getHost(redirectUri);
	const access = scopes.some((scope) => scope === "email" || scope === "profile") ? [...ACCESS, "Ver o teu nome e endereço de email"] : ACCESS;

	return (
		<main className="flex min-h-dvh items-center justify-center px-4 py-16">
			<div className="w-full max-w-sm animate-enter">
				<div className="mb-7 flex flex-col items-center gap-4 text-center">
					<div className="flex items-center gap-3 text-muted-foreground">
						<span className="grid size-10 place-items-center rounded-[9px] bg-muted shadow-border">
							<AppWindow className="size-5" />
						</span>
						<ArrowLeftRight className="size-4" />
						<LogoImpactmail className="size-10" />
					</div>
					<div className="flex flex-col gap-1">
						<h1 className="text-lg font-semibold tracking-tight text-balance">Ligar {client.name} ao ImpactMail</h1>
						{client.host && client.host !== client.name && <p className="font-mono text-xs text-muted-foreground">{client.host}</p>}
					</div>
				</div>

				<div className="overflow-hidden rounded-xl shadow-border">
					<div className="flex flex-col gap-3 p-4">
						<p className="text-sm font-medium">{client.name} vai poder</p>
						<ul className="flex flex-col gap-2.5">
							{access.map((line) => (
								<li key={line} className="flex gap-2.5 text-sm text-pretty text-muted-foreground">
									<Check className="mt-0.5 size-4 shrink-0 text-foreground" />
									{line}
								</li>
							))}
						</ul>
						<p className="text-xs text-muted-foreground">O mesmo acesso que uma chave de API de acesso total.</p>
					</div>
					<form action={switchAccount} className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/40 px-4 py-2.5">
						<input type="hidden" name="oauth_query" value={query} />
						<p className="min-w-0 truncate text-sm">
							<span className="text-muted-foreground">Sessão iniciada como </span>
							<span className="font-medium">{current.user.email}</span>
						</p>
						<ButtonSignout className="shrink-0">Trocar</ButtonSignout>
					</form>
				</div>

				{isLoopbackRedirect(redirectUri) && (
					<p className="mt-4 text-center text-sm text-pretty text-amber-700 dark:text-amber-400">
						Esta app corre no teu computador ({redirectHost}). Permite-a só se foste tu a iniciar esta ligação.
					</p>
				)}

				<div className="mt-6">
					<FormConsent oauthQuery={query} />
				</div>
				<p className="mt-4 text-center text-xs text-pretty text-muted-foreground">
					Depois voltas a {redirectHost}. Podes desligá-la a qualquer momento na página Chaves de API.
				</p>
			</div>
		</main>
	);
}

function Expired() {
	return (
		<main className="flex min-h-dvh items-center justify-center px-4 py-16">
			<div className="flex w-full max-w-xs flex-col items-center gap-3 text-center animate-enter">
				<LogoImpactmail className="size-10" />
				<h1 className="text-lg font-semibold tracking-tight">Este pedido expirou</h1>
				<p className="text-sm text-pretty text-muted-foreground">Volta à app e liga de novo o ImpactMail.</p>
			</div>
		</main>
	);
}

function getHost(value) {
	try {
		return new URL(value).host;
	} catch {
		return "the app";
	}
}
