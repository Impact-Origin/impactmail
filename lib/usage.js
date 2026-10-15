import "server-only";
import Account from "@/models/Account";
import Contact from "@/models/Contact";

export async function addEmailsSent(accountId, count) {
	if (count) await Account.updateOne({ _id: accountId }, { $inc: { "usage.emailsSent": count } });
}

export function countActiveContacts(accountId) {
	return Contact.countDocuments({ accountId, status: "active" });
}

export async function getUsage(account) {
	return {
		emailsSent: account.usage?.emailsSent ?? 0,
		subscribers: await countActiveContacts(account._id),
	};
}
