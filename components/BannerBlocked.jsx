import { Ban } from "lucide-react";

// Across the top of every dashboard page while the account is blocked (lib/account-blocks.js): why, and who
// unblocks it.
export default function BannerBlocked({ account }) {
	const reason = account.pauseReason?.trim().replace(/\.$/, "");

	return (
		<div
			data-plan-bar
			data-blocked-bar
			role="status"
			className="sticky top-0 z-40 flex h-(--plan-bar-height) items-center justify-center gap-3 bg-red-600 px-3 text-white sm:gap-4 sm:px-4 dark:bg-red-700"
		>
			<Ban aria-hidden className="size-4 shrink-0" />
			<p className="line-clamp-2 min-w-0 text-[13px] leading-snug font-medium text-pretty md:truncate md:text-sm" title={reason}>
				Conta bloqueada{reason && `: ${reason}`}
				<span className="hidden font-normal text-white/75 xl:inline"> · Nada é enviado até ser desbloqueada</span>
			</p>
			<span className="hidden shrink-0 text-[13px] text-white/75 sm:inline">Um administrador pode desbloqueá-la</span>
		</div>
	);
}
