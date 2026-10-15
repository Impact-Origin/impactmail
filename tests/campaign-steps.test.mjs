import assert from "node:assert/strict";
import { test } from "node:test";
import { CAMPAIGN_STEPS, getCheckFix, getSendProblem } from "../lib/campaign-steps.js";
import { getPresendChecks } from "../lib/presend-checks.js";

const READY = {
	choice: "now",
	blockingMessage: null,
	scheduledAt: null,
	scheduleProblem: null,
	sendEmails: 240,
	scheduleRecipients: 240,
};

test("the editor goes write, review, send", () => {
	assert.deepEqual(
		CAMPAIGN_STEPS.map(({ label }) => label),
		["Escrever", "Rever", "Enviar"]
	);
});

test("every check that can fail says how to fix it, except the server's own sending switch", () => {
	const { checks } = getPresendChecks({
		campaign: { subject: "", previewText: "", body: "" },
		newsletter: {},
		rendered: { html: "", bytes: 200_000 },
		senderProblem: "Adiciona um email de envio à newsletter",
		isSendingEnabled: false,
		accountProblem: "This account is blocked",
	});
	const fixes = Object.fromEntries(checks.map((check) => [check.id, getCheckFix(check, { newsletterId: "n1" })]));

	assert.deepEqual(fixes.subject, { label: "Editar assunto", field: "subject" });
	assert.equal(fixes.preview.field, "previewText");
	assert.equal(fixes.content.field, "body");
	assert.equal(fixes.unsubscribe.field, "body");
	assert.equal(fixes.size.field, "body");
	assert.deepEqual(fixes.address, { label: "Adicionar uma morada postal", href: "/newsletters#postal-address" });
	assert.equal(fixes.domain.href, "/newsletters/n1");
	assert.equal(fixes.test.action, "test");
	assert.equal(fixes.sending, null);
	// Warnings have no message, so each one comes with a hint instead.
	for (const check of checks.filter(({ isWarning }) => isWarning)) assert.ok(fixes[check.id].hint, check.id);
});

test("sending now stops on what blocked the send dialog: a failing check, nobody to send to", () => {
	assert.equal(getSendProblem(READY), null);
	assert.equal(getSendProblem({ ...READY, blockingMessage: "Adiciona um assunto" }), "Adiciona um assunto");
	assert.equal(getSendProblem({ ...READY, sendEmails: 0 }), "Não há contactos para enviar");
});

test("scheduling stops on what blocked the schedule dialog, and a scheduled campaign can still change its time", () => {
	const later = { ...READY, choice: "later" };
	assert.equal(getSendProblem(later), null);
	assert.equal(getSendProblem({ ...later, scheduleProblem: "Escolhe uma hora no futuro" }), "Escolhe uma hora no futuro");
	assert.equal(getSendProblem({ ...later, scheduleRecipients: 0 }), "Não há contactos para enviar");
	assert.equal(getSendProblem({ ...later, blockingMessage: "Adiciona conteúdo" }), "Adiciona conteúdo");
	// Scheduled already: the dialog opened and showed the problem it had for the time picked.
	assert.equal(
		getSendProblem({ ...later, blockingMessage: "Adiciona conteúdo", scheduledAt: "2026-11-02T09:00:00.000Z", scheduleProblem: "Adiciona conteúdo" }),
		"Adiciona conteúdo"
	);
});
