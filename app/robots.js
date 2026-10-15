import { getAppUrl } from "@/lib/config";

// The dashboard and the newsletter setup, the admin, the APIs, apps' consent and tracked links. Sign-in stays open,
// so crawlers that follow the public pages' links to it read its noindex. Archive hosts get their own robots.txt (proxy.js).
const PRIVATE_PATHS = [
	"/account",
	"/admin",
	"/api/",
	"/api-keys",
	"/campaigns",
	"/contacts",
	"/domains",
	"/mcp",
	"/newsletters",
	"/oauth/",
	"/restore",
	"/welcome",
	"/c/",
	"/o/",
];

export default function robots() {
	return {
		rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
		sitemap: `${getAppUrl()}/sitemap.xml`,
	};
}
