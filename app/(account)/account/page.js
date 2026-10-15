import Link from "next/link";
import { Lock, Send } from "lucide-react";
import AvatarUser from "@/components/AvatarUser";
import BadgeStatus from "@/components/BadgeStatus";
import CardSettings, { RowSettings } from "@/components/CardSettings";
import DialogDeleteAccount from "@/components/DialogDeleteAccount";
import FormProfile from "@/components/FormProfile";
import HeaderPage from "@/components/HeaderPage";
import LayoutNarrow from "@/components/LayoutNarrow";
import { DELETION_GRACE_DAYS, getDeletionBlockers } from "@/lib/account-deletion";
import { hasGoogleSignIn } from "@/lib/accounts";
import { requireAccount } from "@/lib/auth";
import { MAX_NAME_LENGTH } from "@/lib/profile";

export const metadata = { title: "Conta" };

// The whole account, apart from any newsletter: who signs in, and deleting it.
export default async function AccountPage() {
	const { user, account } = await requireAccount();
	const [blockers, hasGoogle] = await Promise.all([getDeletionBlockers(account), hasGoogleSignIn(user.id)]);

	return (
		<LayoutNarrow>
			<HeaderPage title="Conta" icon={<AvatarUser name={user.name} email={user.email} image={user.image} size={32} />} />
			<div className="flex flex-col gap-4">
				<FormProfile name={user.name ?? ""} image={user.image ?? ""} maxNameLength={MAX_NAME_LENGTH} />
				<CardSettings title="Email" stagger={1}>
					<RowSettings label="Endereço" hint={hasGoogle ? "Inicias sessão com o Google ou com um código enviado para aqui." : "Inicias sessão com um código enviado para aqui."}>
						<span className="flex h-9 items-center justify-between gap-3 rounded-lg bg-muted/60 px-2.5 text-sm">
							<span className="truncate">{user.email}</span>
							<Lock aria-label="Não pode ser alterado" className="size-3.5 shrink-0 text-muted-foreground" />
						</span>
					</RowSettings>
				</CardSettings>
				<CardDelete email={user.email} blockers={blockers} />
			</div>
		</LayoutNarrow>
	);
}

function CardDelete({ email, blockers }) {
	return (
		<CardSettings title="Eliminar conta" stagger={3} className="mt-6">
			<p className="px-4 py-3 text-sm text-pretty text-muted-foreground">
				A tua conta para de imediato. {DELETION_GRACE_DAYS} dias depois, as newsletters, contactos, campanhas e imagens são
				eliminados de vez. Iniciar sessão antes disso restaura-a.
			</p>
			{blockers?.campaigns.length > 0 && (
				<RowBlocker icon={Send} title="Para primeiro as tuas campanhas" text="Pausa as que estão a ser enviadas e cancela as agendadas.">
					<ul className="flex flex-col gap-1">
						{blockers.campaigns.map((campaign) => (
							<li key={String(campaign._id)}>
								<Link
									href={`/campaigns/${campaign._id}`}
									className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-muted"
								>
									<span className="truncate">{campaign.subject || "Sem título"}</span>
									<BadgeStatus status={campaign.status} />
								</Link>
							</li>
						))}
					</ul>
				</RowBlocker>
			)}
			<div className="flex justify-end rounded-b-xl bg-destructive/[0.03] px-4 py-3 dark:bg-destructive/[0.06]">
				<DialogDeleteAccount email={email} graceDays={DELETION_GRACE_DAYS} isDisabled={Boolean(blockers)} />
			</div>
		</CardSettings>
	);
}

function RowBlocker({ icon: Icon, title, text, children }) {
	return (
		<div className="flex gap-3 px-4 py-3">
			<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
				<Icon className="size-4" />
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-2.5">
				<div className="flex flex-col gap-0.5">
					<p className="text-sm font-medium">{title}</p>
					<p className="text-sm text-pretty text-muted-foreground">{text}</p>
				</div>
				{children}
			</div>
		</div>
	);
}
