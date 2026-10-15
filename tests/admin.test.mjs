import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { as, catchNotFound, form, signIn, startTestApp } from "./helpers/app.mjs";

let app;
let m;
let admin;
let customer;

before(async () => {
	app = await startTestApp({ ADMIN_EMAILS: "ops@example.com, owner@example.com" });
	m = {
		actions: await import("../app/admin/actions.js"),
		accounts: await import("../lib/accounts.js"),
		contacts: await import("../app/(app)/contacts/actions.js"),
		newsletters: await import("../app/(app)/newsletters/actions.js"),
		Account: (await import("../models/Account.js")).default,
	};
	admin = await signIn("ops@example.com");
	customer = await signIn("customer@example.com");
});

after(() => app?.stop());

test("admin actions answer 404 to anyone outside ADMIN_EMAILS, and change nothing", async () => {
	const id = String(customer.accountId);
	assert.equal(await as(customer, () => catchNotFound(m.actions.blockAccountAction(id, "nope"))), true);
	assert.equal(await as(customer, () => catchNotFound(m.actions.unblockAccountAction(id))), true);
	const untouched = await m.Account.findById(customer.accountId).lean();
	assert.equal(untouched.status, "active");
});

test("blocking and unblocking an account", async () => {
	const id = String(customer.accountId);
	assert.deepEqual(await as(admin, () => m.actions.blockAccountAction(id, "Complaints spike")), { ok: true });
	let account = await m.Account.findById(id).lean();
	assert.equal(account.status, "paused");
	assert.equal(account.pauseReason, "Complaints spike");
	assert.equal(account.pausedBy, "admin");
	assert.ok(account.pausedAt instanceof Date);
	assert.deepEqual(await as(admin, () => m.actions.blockAccountAction(id, "again")), { error: "Already blocked" });

	assert.deepEqual(await as(admin, () => m.actions.unblockAccountAction(id)), { ok: true });
	account = await m.Account.findById(id).lean();
	assert.equal(account.status, "active");
	assert.equal(account.pausedAt, undefined);
	assert.equal(account.pauseReason, undefined);
	assert.equal(account.pausedBy, undefined);
	assert.deepEqual(await as(admin, () => m.actions.unblockAccountAction(id)), { error: "Not blocked" });
});

test("the account list shows each owner, status, usage and creation date, newest first", async () => {
	const url = await as(customer, async () => {
		const { catchRedirect } = await import("./helpers/app.mjs");
		return catchRedirect(
			m.newsletters.saveNewsletter(null, form({ name: "News", slug: "customer-news", fromEmail: "hello@customer-news.mailcheapmail.com", postalAddress: "1 Main St" }))
		);
	});
	await as(customer, () =>
		m.contacts.importContacts({ newsletterId: url.split("/").at(-1), consent: true, rows: [{ email: "a@example.org", status: "active" }, { email: "b@example.org", status: "unsubscribed" }] })
	);

	const accounts = await m.accounts.listAccountsForAdmin();
	assert.deepEqual(accounts.map(({ ownerEmail }) => ownerEmail), ["customer@example.com", "ops@example.com"]);
	const [listed] = accounts;
	assert.equal(listed.activeContacts, 1);
	assert.equal(listed.usage.emailsSent, 0);
	assert.ok(listed.createdAt instanceof Date);
});
