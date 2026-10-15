"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { blockAccount, unblockAccount } from "@/lib/account-blocks";
import { requireAdmin } from "@/lib/auth";
import { getGlobalSuppression, removeGlobalSuppression } from "@/lib/global-suppressions";
import { normalizeEmail } from "@/lib/validation";

const MAX_REASON_LENGTH = 200;

// reason: what the account's owner reads on their dashboard.
export async function blockAccountAction(accountId, reason) {
	const admin = await requireAdmin();
	if (!isValidObjectId(accountId)) return { error: "Account not found" };
	const text = String(reason ?? "").trim().slice(0, MAX_REASON_LENGTH);
	const isBlocked = await blockAccount(accountId, { reason: text, by: "admin", detail: `Blocked by ${admin.email}` });
	console.info(`[admin] ${admin.email} blocked account ${accountId}`);
	revalidatePath("/admin");
	return isBlocked ? { ok: true } : { error: "Already blocked" };
}

// The only way a block ends. Its campaigns stay paused until their owner resumes them.
export async function unblockAccountAction(accountId) {
	const admin = await requireAdmin();
	if (!isValidObjectId(accountId)) return { error: "Account not found" };
	try {
		if (!(await unblockAccount(accountId))) return { error: "Not blocked" };
	} catch (error) {
		console.error(`[admin] The provider didn't resume account ${accountId}:`, error);
		return { error: `Still blocked, the tenant wasn't resumed: ${error.message}` };
	}
	console.info(`[admin] ${admin.email} unblocked account ${accountId}`);
	revalidatePath("/admin");
	return { ok: true };
}

// The never-email list's entry for an address. The address is a reader's, so the logs never name it.
export async function findUndeliverableAddress(email) {
	await requireAdmin();
	const address = normalizeEmail(email);
	if (!address) return { error: "Enter a valid email" };
	const entry = await getGlobalSuppression(address);
	if (!entry) return { email: address, entry: null };
	const { reason, detail, createdAt, expiresAt } = entry;
	return { email: address, entry: { reason, detail: detail ?? null, listedAt: createdAt.toISOString(), expiresAt: expiresAt?.toISOString() ?? null } };
}

// For a false positive: the contacts the list stopped with this address, in every account, are active again.
export async function removeUndeliverableAddress(email) {
	const admin = await requireAdmin();
	const address = normalizeEmail(email);
	if (!address) return { error: "Enter a valid email" };
	const removed = await removeGlobalSuppression(address);
	if (!removed) return { error: "Not on the list" };
	console.info(`[admin] ${admin.email} took an address off the never-email list: ${removed.restored} contacts active again`);
	revalidatePath("/admin");
	return { ok: true, restored: removed.restored };
}
