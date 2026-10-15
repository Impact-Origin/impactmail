import { isSendingEnabled } from "./config.js";

// Stable codes the API and MCP return.
export const ERROR_CODES = {
	accountBlocked: "account_blocked",
	accountDeleting: "account_deleting",
};

// The owner deleted the account and it waits for its purge (lib/account-deletion.js).
export function isDeletionPending(account) {
	return Boolean(account?.deletion?.requestedAt);
}

// An account waiting to be deleted sends nothing, takes no signups and its archive is offline.
export function isAccountActive(account) {
	return Boolean(account) && !isDeletionPending(account);
}

// What isAccountActive reads, for queries that load only that.
export const ACCESS_FIELDS = { deletion: 1 };

// Blocked after spam signals or by an admin (lib/account-blocks.js), stored as "paused".
export function isBlocked(account) {
	return account?.status === "paused";
}

// Who blocked it (account.pausedBy), for the admins.
export const BLOCKED_BY = {
	admin: "por um administrador",
	rates: "pela verificação de 7 dias",
	campaign: "pelas taxas de uma campanha",
	slice: "pela primeira fatia de um primeiro envio",
	trap: "por uma armadilha de spam",
	ses: "pelo SES",
	postshiba: "pela PostShiba",
	gmail: "pela taxa de spam do Gmail",
};

export function getUnblockHint() {
	return "Um administrador pode desbloqueá-la na página de administração.";
}

// What a blocked account's owner reads wherever something is refused: why, and who unblocks it.
export function getBlockedMessage(account) {
	const reason = account?.pauseReason?.trim().replace(/\.$/, "");
	return `Esta conta está bloqueada${reason ? `: ${reason}` : ""}. ${getUnblockHint()}`;
}

// The account menu: whether the account sends, and what to do when it doesn't.
export function getSendingStatus(account) {
	if (isBlocked(account)) return { label: "Conta bloqueada", hint: getBlockedMessage(account), tone: "red" };
	if (!isAccountActive(account)) return { label: "A ser eliminada", hint: null, tone: "gray" };
	if (!isSendingEnabled()) return { label: "Envio desligado", hint: "O envio está desligado neste servidor", tone: "gray" };
	return { label: "Envio ligado", hint: null, tone: "green" };
}

export function codedError({ code, message }) {
	return Object.assign(new Error(message), { code });
}

// For BadgeStatus.
export function getAccountStatus(account) {
	if (isDeletionPending(account)) return "deleting";
	return isBlocked(account) ? "blocked" : "active";
}

// Every email the account sends, welcome and confirmation emails included.
export function getAccountSendProblem(account) {
	if (isBlocked(account)) return { code: ERROR_CODES.accountBlocked, message: getBlockedMessage(account) };
	if (!isAccountActive(account)) return { code: ERROR_CODES.accountDeleting, message: "Esta conta está a ser eliminada" };
	return null;
}
