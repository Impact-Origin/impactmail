import "server-only";
import { ERROR_CODES } from "@/lib/account-state";
import { toActionError } from "@/lib/actions/errors";
import { runAction } from "@/lib/actions/run-action";
import { requireAccount } from "@/lib/auth";

const ACCOUNT_CODES = new Set(Object.values(ERROR_CODES));

// Every dashboard server action goes through here, so the dashboard runs exactly what an API key runs.
// Failures come back as { failure: { code, message } }: a thrown error would replace the page with the error
// boundary.
export async function runDashboardAction(name, input) {
	const { user, account } = await requireAccount();
	try {
		return { output: await runAction(name, { account, user, input, via: "dashboard" }) };
	} catch (error) {
		return { failure: toActionError(error) };
	}
}

// What toasts show, with the account's codes.
export function toFormError({ code, message }) {
	return { error: message, ...(ACCOUNT_CODES.has(code) && { code }) };
}

