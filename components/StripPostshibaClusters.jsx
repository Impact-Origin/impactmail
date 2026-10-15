import { TriangleAlert } from "lucide-react";
import BadgeStatus from "@/components/BadgeStatus";
import { getClusters } from "@/lib/email-provider/postshiba";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

// PostShiba's clusters: one for every email, or campaigns on the bulk one and every other email on the
// transactional one. Their caps are shared by every customer; at a cap, sends wait for the next hour.
export default async function StripPostshibaClusters() {
	const clusters = await getClusters();

	if (clusters.error) {
		return (
			<p className="flex items-center gap-3 rounded-xl px-4 py-4 text-sm text-muted-foreground shadow-border animate-fade-in">
				<TriangleAlert className="size-4 shrink-0 text-amber-500" />
				<span className="truncate">PostShiba unreachable: {clusters.error}</span>
			</p>
		);
	}

	const items = clusters.isSingle
		? [
				{ label: "Cluster, todos os emails", value: <BadgeCluster cluster={clusters.bulk} /> },
				{ label: "Limite", value: formatCaps(clusters.bulk) },
			]
		: [
				{ label: "Cluster de massa", value: <BadgeCluster cluster={clusters.bulk} /> },
				{ label: "Limite de massa", value: formatCaps(clusters.bulk) },
				{ label: "Cluster transacional", value: <BadgeCluster cluster={clusters.transactional} /> },
				{ label: "Limite transacional", value: formatCaps(clusters.transactional) },
			];

	return (
		<div className="overflow-hidden rounded-xl bg-card shadow-border animate-fade-in">
			<dl className={cn("grid grid-cols-2 gap-px bg-border/60", !clusters.isSingle && "lg:grid-cols-4")}>
				{items.map(({ label, value }) => (
					<div key={label} className="flex min-h-[66px] flex-col items-start justify-center gap-1.5 bg-card px-4 py-3">
						<dt className="text-xs text-muted-foreground">{label}</dt>
						<dd className="w-full text-sm font-medium tabular-nums">{value}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

function BadgeCluster({ cluster }) {
	const isReady = cluster.sending_ready && cluster.status === "active";
	const plan = String(cluster.plan ?? "custom");
	return <BadgeStatus status={isReady ? "active" : "paused"} label={`${plan.charAt(0).toUpperCase()}${plan.slice(1)}${isReady ? "" : ", não está pronto"}`} />;
}

function formatCaps(cluster) {
	return `${formatCompact(cluster.emails_per_hour ?? 0)} por hora, ${formatCompact(cluster.emails_per_day ?? 0)} por dia`;
}
