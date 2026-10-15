import Link from "next/link";
import ButtonThemeToggle from "@/components/ButtonThemeToggle";
import LogoWordmark from "@/components/LogoWordmark";
import { currentYear } from "@/lib/format";
import { SOURCE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

// The link to the source stays: the AGPL asks the server to offer its users the code it runs.
export default function FooterSite() {
	const { tagline, columns, company } = FOOTER;
	return (
		<footer className="border-t border-border/60">
			<div className="mx-auto max-w-(--site-width) px-4 pt-12 pb-8 sm:px-6 lg:px-8">
				<div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto]">
					<div className="flex flex-col items-start gap-4">
						<LogoWordmark href="/" className="-ml-1 rounded-lg px-1 py-1" />
						<p className="max-w-xs text-sm text-pretty text-muted-foreground">{tagline}</p>
					</div>
					<nav aria-label="Footer" className={cn("grid gap-x-12 gap-y-8", columns.length > 1 && "grid-cols-2 sm:grid-cols-3")}>
						{columns.map(({ title, links }) => (
							<div key={title} className="flex flex-col gap-3">
								<p className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">{title}</p>
								<ul className="flex flex-col gap-2 text-sm">
									{links.map(({ href, label, isExternal }) => (
										<li key={href}>
											{isExternal ? (
												<a href={href} {...(href.startsWith("http") && { target: "_blank", rel: "noopener" })} className="text-foreground/80 transition-colors hover:text-foreground">
													{label}
												</a>
											) : (
												<Link href={href} className="text-foreground/80 transition-colors hover:text-foreground">
													{label}
												</Link>
											)}
										</li>
									))}
								</ul>
							</div>
						))}
					</nav>
				</div>
				<div className={cn("mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border/60 pt-6", company ? "justify-between" : "justify-end")}>
					{company && (
						<p className="text-xs text-pretty text-muted-foreground tabular-nums">
							© {currentYear()} {company.name}, {company.address}
						</p>
					)}
					<ButtonThemeToggle />
				</div>
			</div>
		</footer>
	);
}

const FOOTER = {
	tagline: "Newsletters sent from your own server.",
	columns: [
		{
			title: "ImpactMail",
			links: [
				{ href: "/docs", label: "Docs" },
				{ href: SOURCE_URL, label: "Source code", isExternal: true },
			],
		},
	],
	company: null,
};
