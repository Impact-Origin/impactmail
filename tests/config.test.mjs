import assert from "node:assert/strict";
import { test } from "node:test";
import { getAdminEmails, getAppUrl, getConfigProblems, isEmailAllowed } from "../lib/config.js";
import { getScheduledJobs } from "../lib/scheduler.js";
import { register } from "../instrumentation.js";

const STRONG = { BETTER_AUTH_SECRET: "s".repeat(32), SUPPRESSION_HASH_KEY: "k".repeat(32) };

async function withEnv(values, run) {
	const previous = { ...process.env };
	try {
		Object.assign(process.env, values);
		return await run();
	} finally {
		process.env = previous;
	}
}

test("BETTER_AUTH_SECRET and SUPPRESSION_HASH_KEY need 32 characters each", () => {
	assert.deepEqual(getConfigProblems(STRONG), []);
	assert.deepEqual(getConfigProblems({ ...STRONG, BETTER_AUTH_SECRET: "s".repeat(31) }), [
		"BETTER_AUTH_SECRET must be at least 32 characters (generate one with: openssl rand -base64 48).",
	]);
	assert.deepEqual(getConfigProblems({ ...STRONG, SUPPRESSION_HASH_KEY: "k".repeat(31) }), [
		"SUPPRESSION_HASH_KEY must be at least 32 characters (generate one with: openssl rand -base64 48).",
	]);
	assert.equal(getConfigProblems({}).length, 2, "missing counts as too short");
});

test("the server doesn't start with a short secret or hash key", () =>
	withEnv(STRONG, () => {
		assert.doesNotThrow(register);
		process.env.SUPPRESSION_HASH_KEY = "short";
		assert.throws(register, /ImpactMail can't start\. SUPPRESSION_HASH_KEY must be at least 32 characters/);
		process.env.SUPPRESSION_HASH_KEY = STRONG.SUPPRESSION_HASH_KEY;
		process.env.BETTER_AUTH_SECRET = "short";
		assert.throws(register, /ImpactMail can't start\. BETTER_AUTH_SECRET must be at least 32 characters/);
	}));

test("APP_URL wins, then Railway's public domain, then localhost", () => {
	assert.equal(getAppUrl({ APP_URL: "https://mail.example.com/", RAILWAY_PUBLIC_DOMAIN: "app.up.railway.app" }), "https://mail.example.com");
	assert.equal(getAppUrl({ RAILWAY_PUBLIC_DOMAIN: "app.up.railway.app" }), "https://app.up.railway.app");
	assert.equal(getAppUrl({}), "http://localhost:3000");
});

test("the server calls its own cron routes once CRON_SECRET is set, unless SCHEDULER is off", () => {
	assert.deepEqual(getScheduledJobs({}), []);
	assert.deepEqual(getScheduledJobs({ CRON_SECRET: "c", SCHEDULER: "off" }), []);
	assert.deepEqual(
		getScheduledJobs({ CRON_SECRET: "c", PORT: "8080" }).map(({ url, everyMs }) => [url, everyMs / 3_600_000]),
		[
			["http://127.0.0.1:8080/api/cron/hourly", 1],
			["http://127.0.0.1:8080/api/cron/postmaster", 24],
		]
	);
});

test("the health check answers ok, or fails with the reason and never a value", async () => {
	const { GET } = await import("../app/api/health/route.js");
	await withEnv(STRONG, async () => {
		const healthy = await GET();
		assert.equal(healthy.status, 200);
		assert.deepEqual(await healthy.json(), { ok: true });
		assert.equal(healthy.headers.get("cache-control"), "no-store");

		process.env.BETTER_AUTH_SECRET = "short-secret-value";
		const failing = await GET();
		assert.equal(failing.status, 503);
		const body = await failing.json();
		assert.equal(body.ok, false);
		assert.match(body.problems[0], /BETTER_AUTH_SECRET must be at least 32 characters/);
		assert.equal(JSON.stringify(body).includes("short-secret-value"), false, "never a value");
	});
});

test("ALLOWED_EMAILS, its @domains and ADMIN_EMAILS sign in, and nobody when both are empty", () => {
	const env = { ALLOWED_EMAILS: " Jane@Example.com, @Team.example.org ,", ADMIN_EMAILS: "ops@example.net" };
	for (const email of ["jane@example.com", "JANE@example.com ", "anyone@team.example.org", "ops@example.net"]) {
		assert.equal(isEmailAllowed(email, env), true, email);
	}
	for (const email of ["john@example.com", "x@sub.team.example.org", "team.example.org@evil.dev", "@team.example.org", "jane@example.com.evil.dev", "jane@", "", null]) {
		assert.equal(isEmailAllowed(email, env), false, String(email));
	}
	assert.equal(isEmailAllowed("jane@example.com", {}), false, "never open by default");
});

test("ADMIN_EMAILS is a comma-separated list, trimmed and lowercased", () => {
	const previous = process.env.ADMIN_EMAILS;
	try {
		process.env.ADMIN_EMAILS = " Owner@Example.com, ops@example.org ,,";
		assert.deepEqual(getAdminEmails(), ["owner@example.com", "ops@example.org"]);
		delete process.env.ADMIN_EMAILS;
		assert.deepEqual(getAdminEmails(), []);
	} finally {
		if (previous === undefined) delete process.env.ADMIN_EMAILS;
		else process.env.ADMIN_EMAILS = previous;
	}
});
