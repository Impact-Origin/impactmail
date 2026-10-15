import assert from "node:assert/strict";
import { test } from "node:test";
import { LIMITS } from "../lib/config.js";
import { getFirstSendProblem } from "../lib/first-send.js";
import { judgeRates } from "../lib/rate-levels.js";
import { getAccountRateProblem, getCampaignRateProblem } from "../lib/sending-rules.js";

const level = (counts) => judgeRates(counts)?.level ?? null;

test("the two levels live in one place", () => {
	assert.deepEqual(LIMITS.pause, { bounceRate: 0.02, minBounces: 5, complaintRate: 0.0008, minComplaints: 2 });
	assert.deepEqual(LIMITS.block, { bounceRate: 0.05, minBounces: 10, complaintRate: 0.003, minComplaints: 3 });
});

test("complaints: one never counts, two pause over 0.08%, three block over 0.3%", () => {
	assert.equal(level({ sent: 100, complained: 1 }), null, "1 complaint, at 1%");
	assert.equal(level({ sent: 10, complained: 1 }), null, "1 complaint, at 10%");
	assert.equal(level({ sent: 1000, complained: 2 }), "pause", "2 complaints at 0.20%");
	assert.equal(level({ sent: 100, complained: 2 }), "pause", "2 complaints never block, even at 2%");
	assert.equal(level({ sent: 2500, complained: 2 }), null, "exactly 0.08% is under");
	assert.equal(level({ sent: 999, complained: 3 }), "block", "3 complaints just over 0.3%");
	assert.equal(level({ sent: 1000, complained: 3 }), "pause", "3 complaints at exactly 0.3%");
	assert.equal(level({ sent: 1001, complained: 3 }), "pause", "3 complaints just under 0.3%");
	assert.equal(level({ sent: 3750, complained: 3 }), null, "3 complaints at 0.08%");
});

test("hard bounces: 5 at least to pause over 2%, 10 at least to block over 5%", () => {
	assert.equal(level({ sent: 100, bounced: 4 }), null, "4 bounces, at 4%");
	assert.equal(level({ sent: 100, bounced: 5 }), "pause", "5 bounces at 5%");
	assert.equal(level({ sent: 250, bounced: 5 }), null, "5 bounces at exactly 2%");
	assert.equal(level({ sent: 20, bounced: 9 }), "pause", "9 bounces never block, even at 45%");
	assert.equal(level({ sent: 199, bounced: 10 }), "block", "10 bounces just over 5%");
	assert.equal(level({ sent: 200, bounced: 10 }), "pause", "10 bounces at exactly 5%");
	assert.equal(level({ sent: 0, bounced: 10 }), null);
});

test("each place words its level: a campaign, a primeira fatia de um primeiro envio, the last 7 days", () => {
	assert.deepEqual(getCampaignRateProblem({ sent: 900, bounced: 21 }, { sent: 100, bounced: 4 }), {
		level: "pause",
		reason:
			"Taxa de devoluções de 2,50% nesta campanha (limite 2,00%). Verifica de onde vieram estes contactos antes de retomar: a 5,00% com 10 devoluções, a conta é bloqueada.",
	});
	assert.equal(getCampaignRateProblem({ sent: 900, bounced: 6 }, { sent: 100, bounced: 4 }), null, "last-chance emails count too: 1.00% in all");
	assert.deepEqual(getCampaignRateProblem({ sent: 900, complained: 1 }, { sent: 100, complained: 3 }), {
		level: "block",
		reason: "Taxa de denúncias de 0,40% numa campanha (limite 0,30%)",
	});
	assert.match(getCampaignRateProblem({ sent: 1000, complained: 2 }).reason, /^Taxa de denúncias de 0,20% nesta campanha \(limite 0,08%\)\. Verifica se estes contactos pediram/);

	assert.deepEqual(getFirstSendProblem({ sent: 200, bounced: 6 }), { level: "pause", reason: "Os primeiros 200 contactos novos tiveram uma taxa de devoluções de 3,00% (limite 2,00%)" });
	assert.deepEqual(getFirstSendProblem({ sent: 200, bounced: 12 }), { level: "block", reason: "Os primeiros 200 contactos novos tiveram uma taxa de devoluções de 6,00% (limite 5,00%)" });
	assert.equal(getFirstSendProblem({ sent: 200, complained: 1 }), null);

	assert.deepEqual(getAccountRateProblem({ sent: 600, delivered: 580, bounced: 36 }), {
		level: "block",
		reason: "Taxa de devoluções de 6,00% nos últimos 7 dias (limite 5,00%)",
	});
	assert.match(getAccountRateProblem({ sent: 600, bounced: 13 }).reason, /^Taxa de devoluções de 2,17% nos últimos 7 dias \(limite 2,00%\)\. Nada está em pausa/);
	assert.equal(getAccountRateProblem({ sent: 600, bounced: 13 }).level, "pause");
});
