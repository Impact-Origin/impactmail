import FooterSite from "@/components/FooterSite";
import HeaderSite from "@/components/HeaderSite";
import { getAppUrl } from "@/lib/config";
import { newsreader } from "@/lib/fonts";
import { SITE_OPEN_GRAPH } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata = {
	metadataBase: new URL(getAppUrl()),
	robots: { index: true, follow: true },
	manifest: "/site.webmanifest",
	openGraph: SITE_OPEN_GRAPH,
	twitter: { card: "summary_large_image" },
};

// The docs need a wider page than the rest; the header and footer follow whichever page is open.
export default function SiteLayout({ children }) {
	return (
		<div
			className={cn(
				newsreader.variable,
				"flex min-h-dvh flex-col bg-site [--site-width:72rem] has-[[data-layout=docs]]:[--site-width:80rem]"
			)}
		>
			<HeaderSite />
			<div className="flex-1">{children}</div>
			<FooterSite />
		</div>
	);
}
