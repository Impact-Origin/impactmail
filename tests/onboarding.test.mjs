import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { getCleanupSettings } from "../lib/cleanup.js";
import { as, catchRedirect, form, signIn, startTestApp } from "./helpers/app.mjs";

// A new account names its newsletter at /welcome, then the dashboard opens.
let app;
let m;

before(async () => {
	app = await startTestApp();
	m = {
		welcome: await import("../app/welcome/actions.js"),
		onboarding: await import("../lib/onboarding.js"),
		Account: (await import("../models/Account.js")).default,
		Newsletter: (await import("../models/Newsletter.js")).default,
	};
});

after(() => app?.stop());

function welcome(user, fields) {
	return as(user, () => catchRedirect(m.welcome.completeOnboarding(null, form(fields))));
}

function loadAccount(user) {
	return m.Account.findById(user.accountId).lean();
}

describe("/welcome", () => {
	test("a new account names its newsletter first, from the answers, then the dashboard opens", async () => {
		const user = await signIn("new@example.com");
		assert.equal(await m.onboarding.needsOnboarding(await loadAccount(user)), true);

		const answers = { name: "Field notes", description: "One idea a week.", fromName: "Jane", listSize: "growth", listSource: "Substack" };
		assert.equal(await welcome(user, answers), "/");
		const newsletter = await m.Newsletter.findOne({ accountId: user.accountId }).lean();
		assert.deepEqual(
			[newsletter.name, newsletter.slug, newsletter.description, newsletter.fromName, newsletter.fromEmail],
			["Field notes", "field-notes", "One idea a week.", "Jane", "hello@field-notes.mailcheapmail.com"]
		);
		assert.deepEqual(getCleanupSettings(newsletter), { enabled: true, issues: 6, days: 180 }, "list cleanup starts on");
		const account = await loadAccount(user);
		assert.deepEqual([account.onboarding.listSize, account.onboarding.listSource], ["growth", "Substack"]);
		assert.ok(account.onboarding.completedAt);
		assert.equal(await m.onboarding.needsOnboarding(account), false);

		assert.equal(await welcome(user, { name: "Again" }), "/", "sent twice, it only finishes");
		assert.equal(await m.Newsletter.countDocuments({ accountId: user.accountId }), 1);
	});

	test("a name another newsletter has gets a numbered slug", async () => {
		const user = await signIn("second@example.com");
		assert.equal(await welcome(user, { name: "Field notes", listSize: "none", listSource: "Substack" }), "/");
		assert.equal((await m.Newsletter.findOne({ accountId: user.accountId }).lean()).slug, "field-notes-2");
		const account = await loadAccount(user);
		assert.equal(account.onboarding.listSource, undefined, "no list, no source");
	});

	test("a name is needed, and answers that aren't choices aren't kept", async () => {
		const user = await signIn("blank@example.com");
		assert.deepEqual(await as(user, () => m.welcome.completeOnboarding(null, form({ name: "  " }))), { error: "Dá um nome à tua newsletter" });
		assert.equal(await welcome(user, { name: "Notes", listSize: "huge", listSource: "Myspace" }), "/");
		assert.equal((await loadAccount(user)).onboarding.listSize, undefined);
	});

	test("the list's source is beehiiv, Mailchimp, Substack or somewhere else, and a source saved from earlier choices stays", async () => {
		assert.deepEqual([...m.onboarding.LIST_SOURCES, m.onboarding.OTHER_LIST_SOURCE], ["beehiiv", "Mailchimp", "Substack", "Noutro sítio"]);
		const user = await signIn("elsewhere@example.com");
		assert.equal(await welcome(user, { name: "Elsewhere", listSize: "starter", listSource: "Noutro sítio" }), "/");
		assert.equal((await loadAccount(user)).onboarding.listSource, "Noutro sítio");

		const earlier = await signIn("from-kit@example.com");
		assert.equal(await welcome(earlier, { name: "From Kit", listSize: "growth", listSource: "Kit" }), "/");
		assert.equal((await loadAccount(earlier)).onboarding.listSource, undefined, "Kit isn't a choice anymore");
		await m.Account.updateOne({ _id: earlier.accountId }, { $set: { "onboarding.listSource": "Kit" } });
		await assert.doesNotReject((await m.Account.findById(earlier.accountId)).validate(), "an answer saved before still validates");
		assert.equal(await welcome(earlier, { name: "From Kit" }), "/", "sent again, it only finishes");
		const account = await loadAccount(earlier);
		assert.equal(account.onboarding.listSource, "Kit", "and leaves the saved answer as it was");
	});
});
