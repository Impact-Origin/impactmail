import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { getPostalAddress, toPostalAddressFields } from "../lib/postal-address.js";
import { as, callApi, catchRedirect, form, signIn, startTestApp } from "./helpers/app.mjs";
import { sent } from "./stubs/ses.mjs";

// A newsletter's postal address: an empty one keeps sending off until it has one.
describe("the address emails print", () => {
	test("the newsletter's own, trimmed", () => {
		assert.equal(getPostalAddress({ postalAddress: " 1 Main St " }), "1 Main St");
		assert.equal(getPostalAddress({}), "");
		assert.equal(getPostalAddress(null), "");
	});

	test("saving an empty one clears it, any other is the newsletter's", () => {
		assert.deepEqual(toPostalAddressFields("  "), { postalAddress: "", postalAddressCleared: true });
		assert.deepEqual(toPostalAddressFields("1 Main St"), { postalAddress: "1 Main St", postalAddressCleared: false });
	});
});

describe("clearing it", () => {
	let app;
	let m;

	before(async () => {
		app = await startTestApp();
		m = {
			newsletters: await import("../app/(app)/newsletters/actions.js"),
			campaigns: await import("../app/(app)/campaigns/actions.js"),
			apiKeys: await import("../app/(app)/api-keys/actions.js"),
			Newsletter: (await import("../models/Newsletter.js")).default,
		};
	});

	after(() => app?.stop());

	async function draft(user, newsletterId) {
		const url = await as(user, () => catchRedirect(m.campaigns.createCampaign(newsletterId)));
		const id = url.split("/").at(-1);
		await as(user, () => m.campaigns.saveCampaign(id, { subject: "Issue", previewText: "This week", body: "<p>Hello</p>" }));
		return id;
	}

	test("saved empty in the settings, nothing sends until an address is typed in", async () => {
		const user = await signIn("postal-clear@example.com");
		let newsletterId = null;
		const save = (postalAddress) => form({ ...(newsletterId && { id: newsletterId }), name: "Cleared", slug: "cleared-notes", postalAddress });
		newsletterId = (await as(user, () => catchRedirect(m.newsletters.saveNewsletter(null, save(""))))).split("/").at(-1);
		assert.equal((await m.Newsletter.findOne({ accountId: user.accountId }).lean()).postalAddressCleared, true);

		const campaign = await draft(user, newsletterId);
		assert.deepEqual(await as(user, () => m.campaigns.sendTestCampaign(campaign)), { error: "Adiciona uma morada postal à newsletter" });
		const key = (await as(user, () => m.apiKeys.createApiKey(null, form({ name: "Agent", level: "full" })))).key;
		assert.equal((await callApi("GET", `/api/v1/newsletters/${newsletterId}`, { key })).body.postalAddress, "");

		assert.equal((await as(user, () => m.newsletters.saveNewsletter(null, save("2 Main St, Paris")))).ok, true);
		assert.equal((await m.Newsletter.findOne({ accountId: user.accountId }).lean()).postalAddressCleared, false);
		assert.deepEqual(await as(user, () => m.campaigns.sendTestCampaign(campaign)), { ok: true });
		assert.match(sent.at(-1).html, /2 Main St, Paris/);

		const patched = await callApi("PATCH", `/api/v1/newsletters/${newsletterId}`, { key, body: { fromName: "Jane" } });
		assert.equal(patched.body.postalAddress, "2 Main St, Paris", "a change that leaves it out keeps it");
		assert.equal((await callApi("PATCH", `/api/v1/newsletters/${newsletterId}`, { key, body: { postalAddress: "" } })).body.postalAddress, "");
		assert.deepEqual(await as(user, () => m.campaigns.sendTestCampaign(campaign)), { error: "Adiciona uma morada postal à newsletter" });
	});
});
