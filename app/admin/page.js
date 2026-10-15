import { Suspense } from "react";
import { Users } from "lucide-react";
import CardPostmaster from "@/components/CardPostmaster";
import CardStat from "@/components/CardStat";
import CardUndeliverable from "@/components/CardUndeliverable";
import HeaderPage from "@/components/HeaderPage";
import { SkeletonSesAccount } from "@/components/SkeletonOverview";
import StateEmpty from "@/components/StateEmpty";
import StripPostshibaClusters from "@/components/StripPostshibaClusters";
import StripSesAccount from "@/components/StripSesAccount";
import TableAccounts from "@/components/TableAccounts";
import { isBlocked } from "@/lib/account-state";
import { listAccountsForAdmin } from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";
import { getEmailProvider } from "@/lib/email-provider";
import { formatNumber } from "@/lib/format";
import { countGlobalSuppressions } from "@/lib/global-suppressions";
import { serialize } from "@/lib/serialize";

export const metadata = { title: "Accounts" };

export default async function AdminPage({ searchParams }) {
	await requireAdmin();
	const { postmaster } = await searchParams;
	const [accounts, undeliverable] = await Promise.all([listAccountsForAdmin(), countGlobalSuppressions()]);
	const blocked = accounts.filter(isBlocked);
	const provider = getEmailProvider();

	return (
		<>
			<HeaderPage title="Accounts" />
			<div className="flex flex-col gap-8">
				<div className="grid gap-3 sm:grid-cols-2 animate-enter lg:grid-cols-3">
					<CardStat label="Accounts" value={formatNumber(accounts.length)} detail="Newest 200 below" />
					<CardStat
						label="Blocked"
						value={formatNumber(blocked.length)}
						detail={blocked.length > 0 && "Unblock from an account's menu"}
						tone={blocked.length > 0 ? "warn" : "default"}
					/>
					<CardStat label="Email provider" value={provider.name} detail={process.env.EMAIL_PROVIDER ? "Set by EMAIL_PROVIDER" : "The default"} />
				</div>

				<section style={{ "--stagger": 1 }} className="flex flex-col gap-3 animate-enter">
					<h2 className="text-sm font-medium text-muted-foreground">Accounts</h2>
					{accounts.length === 0 ? (
						<StateEmpty icon={Users} title="No accounts yet" />
					) : (
						<TableAccounts accounts={serialize(accounts)} />
					)}
				</section>

				<section style={{ "--stagger": 2 }} className="flex flex-col gap-3 animate-enter">
					<h2 className="text-sm font-medium text-muted-foreground">Undeliverable addresses</h2>
					<CardUndeliverable bounces={undeliverable.bounces} traps={undeliverable.traps} />
				</section>

				<section style={{ "--stagger": 3 }} className="flex flex-col gap-3 animate-enter">
					<h2 className="text-sm font-medium text-muted-foreground">{provider.name}</h2>
					<Suspense fallback={<SkeletonSesAccount />}>{provider.id === "ses" ? <StripSesAccount /> : <StripPostshibaClusters />}</Suspense>
				</section>

				<section style={{ "--stagger": 4 }} className="flex flex-col gap-3 animate-enter">
					<h2 className="text-sm font-medium text-muted-foreground">Gmail spam rates</h2>
					<Suspense fallback={<SkeletonSesAccount />}>
						<CardPostmaster notice={typeof postmaster === "string" ? postmaster : undefined} />
					</Suspense>
				</section>
			</div>
		</>
	);
}
