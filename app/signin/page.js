import { redirect } from "next/navigation";
import ButtonSigninGoogle from "@/components/ButtonSigninGoogle";
import FormSignin from "@/components/FormSignin";
import LayoutSplit from "@/components/LayoutSplit";
import LogoWordmark from "@/components/LogoWordmark";
import { DELETION_GRACE_DAYS } from "@/lib/account-deletion";
import { getSession, getSignupError, isGoogleEnabled } from "@/lib/auth";
import { readOAuthRequest } from "@/lib/oauth";
import { toSafeNextPath } from "@/lib/validation";

export const metadata = { title: "Iniciar sessão" };

// Also where an app connecting with OAuth (ChatGPT, Claude) sends people who aren't signed in: Better Auth
// adds the signed authorization request to the query, and signing in carries on to the consent page.
export default async function SigninPage({ searchParams }) {
	const params = await searchParams;
	const { next, error, deleted } = params;
	const nextPath = toSafeNextPath(next);
	const oauthRequest = await readOAuthRequest(params);
	if (!oauthRequest && (await getSession())) redirect(nextPath);
	const oauthQuery = oauthRequest && !oauthRequest.isExpired ? oauthRequest.query : null;
	const intro = getIntro(oauthRequest, deleted !== undefined);

	return (
		<LayoutSplit>
			<header className="flex h-9 items-center">
				<LogoWordmark href="/" className="rounded-md" />
			</header>
			<div className="flex flex-1 items-center justify-center py-12">
				<div className="w-full max-w-[22rem] animate-enter">
					<h1 className="font-display text-[2.5rem] leading-[1.05] font-[480] tracking-[-0.03em] text-balance">Inicia sessão no ImpactMail</h1>
					{intro && <p className="mt-3 text-[15px] leading-6 text-pretty text-muted-foreground">{intro}</p>}
					{oauthRequest?.isExpired ? null : (
						<div className="mt-8">
							{isGoogleEnabled() && (
								<>
									<ButtonSigninGoogle next={nextPath} oauthQuery={oauthQuery} />
									<div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
										<span className="h-px flex-1 bg-border" />
										ou
										<span className="h-px flex-1 bg-border" />
									</div>
								</>
							)}
							{typeof error === "string" && (
								<p role="alert" className="mb-3 text-sm text-pretty text-destructive">
									{getSignupError(error) ?? "O início de sessão com o Google falhou. Tenta de novo."}
								</p>
							)}
							<FormSignin next={nextPath} oauthQuery={oauthQuery} />
						</div>
					)}
				</div>
			</div>
		</LayoutSplit>
	);
}

// Only what changes what to do: an app connecting, an expired link, an account just deleted, or a server that lets
// few emails in.
function getIntro(oauthRequest, isDeleted) {
	if (oauthRequest?.isExpired) return "Este link de início de sessão expirou. Volta à app e liga de novo o ImpactMail.";
	if (oauthRequest) return `${oauthRequest.client.name} quer ligar-se à tua conta ImpactMail. Inicia sessão primeiro.`;
	if (isDeleted) return `A tua conta foi eliminada. Inicia sessão nos próximos ${DELETION_GRACE_DAYS} dias para a restaurar.`;
	return "Só os emails autorizados neste servidor podem iniciar sessão.";
}
