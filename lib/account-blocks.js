import "server-only";
import { BLOCKED_BY, ERROR_CODES, getUnblockHint, isBlocked } from "@/lib/account-state";
import { sendAlert } from "@/lib/alerts";
import { connectDb } from "@/lib/db";
import { resumeTenant, suspendTenantQuietly } from "@/lib/tenants";
import Account from "@/models/Account";
import Campaign from "@/models/Campaign";

export const BLOCKED_CAMPAIGN_REASON = "a conta está bloqueada";

// Every block, whatever set it off, reaches the admins and the owner at once: no cooldown, and the block's time in
// the key makes each one an alert of its own. An admin's own block is only emailed to the admins.
async function alertBlock(accountId, { reason, by, detail, at }) {
	const why = [reason, detail].filter(Boolean).join(". ") || "sem motivo indicado";
	await Promise.all([
		sendAlert({
			accountId: null,
			key: `${by === "admin" ? "account-blocked-by-admin" : "account-blocked"}:${accountId}:${at.getTime()}`,
			title: "Conta bloqueada",
			detail: `Conta ${accountId}, bloqueada ${BLOCKED_BY[by] ?? `por ${by}`}: ${why}.`,
			action: "Revê-a na página de administração e desbloqueia-a quando estiver resolvido.",
			path: "/admin",
			cooldownMinutes: 0,
		}),
		sendAlert({
			accountId,
			key: "account-blocked",
			title: "Conta bloqueada",
			detail: `${reason ? `${reason}. ` : ""}Nada é enviado a partir desta conta, incluindo emails de boas-vindas, e as importações e alterações estão desligadas. ${getUnblockHint()}`,
			path: "/",
			cooldownMinutes: 0,
		}),
	]);
}

// Spam signals stop the whole account at once: every newsletter's sends, welcome and confirmation emails, imports,
// new contacts and every change but stopping things (lib/actions/run-action.js), its tracked links (app/c) and its
// tenant at the provider.
// Nothing lifts it but an admin (unblockAccount). reason: what the owner reads. detail: for the admins only, like a
// provider's own answer. True when this call blocked it.
export async function blockAccount(accountId, { reason, by = "admin", detail } = {}) {
	await connectDb();
	const pausedAt = new Date();
	const { modifiedCount } = await Account.updateOne(
		{ _id: accountId, status: { $ne: "paused" } },
		{ $set: { status: "paused", pausedAt, pauseReason: reason || undefined, pausedBy: by } }
	);
	if (modifiedCount === 0) return false;
	await Campaign.updateMany(
		{ accountId, status: "sending" },
		{ $set: { status: "paused", pauseReason: BLOCKED_CAMPAIGN_REASON, pauseCode: ERROR_CODES.accountBlocked } }
	);
	await suspendTenantQuietly(accountId);
	await alertBlock(accountId, { reason, by, detail, at: pausedAt });
	return true;
}

// From the admin page only. The provider lifts its own pause on the tenant first, and throws while it holds it
// (PostShiba's operator_hold), so a provider's hold waits for the provider too. True when this call unblocked it.
export async function unblockAccount(accountId) {
	await connectDb();
	const account = await Account.findById(accountId).select({ status: 1 }).lean();
	if (!isBlocked(account)) return false;
	await resumeTenant(accountId);
	const { modifiedCount } = await Account.updateOne(
		{ _id: accountId, status: "paused" },
		{ $set: { status: "active", unblockedAt: new Date() }, $unset: { pausedAt: 1, pauseReason: 1, pausedBy: 1 } }
	);
	return modifiedCount > 0;
}
