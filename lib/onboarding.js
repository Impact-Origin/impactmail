import "server-only";
import { scoped } from "@/lib/account-scope";
import { getSharedDomain } from "@/lib/config";
import { connectDb } from "@/lib/db";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { slugify } from "@/lib/slug";
import Newsletter from "@/models/Newsletter";

// The list a new account says it has.
export const LIST_SIZES = [
	{ id: "none", label: "Not yet" },
	{ id: "starter", label: "Under 5,000" },
	{ id: "growth", label: "5,000 to 15,000" },
	{ id: "pro", label: "15,000 to 45,000" },
	{ id: "scale", label: "45,000 to 100,000" },
	{ id: "more", label: "Over 100,000" },
];

// Where the list is now: a button for each platform, and a link for any other. Accounts keep sources saved from
// earlier choices, like Kit.
export const LIST_SOURCES = ["beehiiv", "Mailchimp", "Substack"];
export const OTHER_LIST_SOURCE = "Somewhere else";

// With a shared domain, a new account's first stop is /welcome, which names its newsletter. Without one, a
// newsletter needs a from address on the account's own domain, so the dashboard opens and Add a newsletter asks for it.
export async function needsOnboarding(account) {
	if (!getSharedDomain()) return false;
	await connectDb();
	return !(await Newsletter.exists(scoped(account)));
}

// The slug made from the name, numbered when another account's newsletter has it or ImpactMail keeps it.
export async function findFreeSlug(name) {
	const base = slugify(name, 37) || "newsletter";
	for (let number = 1; number < 100; number++) {
		const slug = number === 1 ? base : `${base}-${number}`;
		if (!isReservedSlug(slug) && !(await Newsletter.exists({ slug }).setOptions({ crossAccount: true }))) return slug;
	}
	return `${slugify(name, 30) || "newsletter"}-${Date.now().toString(36)}`;
}
