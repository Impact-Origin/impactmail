import BadgeStatus from "@/components/BadgeStatus";
import MenuAccount from "@/components/MenuAccount";
import TextEmpty from "@/components/TextEmpty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BLOCKED_BY, getAccountStatus, isBlocked } from "@/lib/account-state";
import { LIMITS } from "@/lib/config";
import { getEmailProvider } from "@/lib/email-provider";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function TableAccounts({ accounts }) {
	const provider = getEmailProvider();
	return (
		<div className="overflow-hidden rounded-xl shadow-border">
			<Table>
				<TableHeader>
					<TableRow className="hover:bg-transparent">
						<TableHead className="pl-4">Owner</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="hidden text-right md:table-cell">Emails sent</TableHead>
						<TableHead className="hidden text-right md:table-cell">Subscribers</TableHead>
						<TableHead className="hidden text-right lg:table-cell">Last 7 days</TableHead>
						<TableHead className="hidden xl:table-cell">{provider.name} tenant</TableHead>
						<TableHead className="hidden text-right sm:table-cell">Created</TableHead>
						<TableHead className="w-12 pr-2" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{accounts.map((account) => {
						const blockedBy = isBlocked(account) ? `Blocked by ${BLOCKED_BY[account.pausedBy] ?? "an admin"}` : null;
						return (
							<TableRow key={account._id} className="tabular-nums">
								<TableCell className="max-w-0 py-2.5 pl-4 sm:w-1/4">
									<span className="block truncate font-medium">{account.ownerEmail ?? <TextEmpty />}</span>
									{blockedBy && (
										<span className="block truncate text-xs text-red-600 dark:text-red-400" title={account.pauseReason}>
											{blockedBy}
											{account.pauseReason && `: ${account.pauseReason}`}
										</span>
									)}
								</TableCell>
								<TableCell>
									<BadgeStatus status={getAccountStatus(account)} />
								</TableCell>
								<TableCell className="hidden text-right md:table-cell">
									{formatNumber(account.usage?.emailsSent ?? 0)}
								</TableCell>
								<TableCell className="hidden text-right md:table-cell">
									{formatNumber(account.activeContacts)}
								</TableCell>
								<TableCell className="hidden text-right lg:table-cell">
									<Health health={account.health} />
								</TableCell>
								<TableCell className="hidden max-w-0 xl:table-cell">
									<Tenant tenant={provider.describeTenant(account)} />
								</TableCell>
								<TableCell className="hidden text-right text-muted-foreground sm:table-cell">
									{formatDate(account.createdAt)}
								</TableCell>
								<TableCell className="pr-2 text-right">
									<MenuAccount
										accountId={account._id}
										email={account.ownerEmail}
										blockedBy={blockedBy}
										blockReason={account.pauseReason ?? null}
										providerName={provider.name}
									/>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

// Bounce and complaint rates from the last account check (lib/account-health.js).
function Health({ health }) {
	if (!health?.sent) return <TextEmpty />;
	return (
		<span className="text-xs">
			<Rate value={health.bounceRate} limit={LIMITS.pause.bounceRate} /> bounces ·{" "}
			<Rate value={health.complaintRate} limit={LIMITS.pause.complaintRate} digits={3} /> complaints
		</span>
	);
}

function Rate({ value = 0, limit, digits = 2 }) {
	return <span className={cn(value > limit && "text-red-600 dark:text-red-400")}>{(value * 100).toFixed(digits)}%</span>;
}

// The account's tenant at the active provider (describeTenant in lib/email-provider), with its status there.
function Tenant({ tenant }) {
	if (!tenant) return <span className="text-xs text-muted-foreground">No tenant yet</span>;
	const isStopped = STOPPED_TENANT_STATUSES.has(tenant.status);
	return (
		<span className="flex min-w-0 flex-col text-xs">
			<span className="truncate font-mono" title={tenant.slug ?? tenant.id}>
				{tenant.id}
			</span>
			<span className={cn("truncate", isStopped ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
				{TENANT_STATUSES[tenant.status] ?? tenant.status ?? "Status unknown"}
			</span>
			{tenant.detail && <span className="truncate text-muted-foreground">{tenant.detail}</span>}
		</span>
	);
}

const TENANT_STATUSES = {
	active: "Active",
	suspended: "Suspended with the account",
	operator_hold: "Held by PostShiba (operator_hold)",
	ENABLED: "Enabled",
	DISABLED: "Paused by SES",
	REINSTATED: "Reinstated",
};
const STOPPED_TENANT_STATUSES = new Set(["suspended", "operator_hold", "DISABLED"]);
