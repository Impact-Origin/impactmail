import { getAppUrl } from "@/lib/config";
import { DOC_PAGES } from "@/lib/docs/llms";

// The app domain's pages: the docs. Archive hosts get their own sitemap.xml (proxy.js).
export default function sitemap() {
	const appUrl = getAppUrl();
	return DOC_PAGES.map(({ href }) => ({ url: `${appUrl}${href}` }));
}
