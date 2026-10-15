import "server-only";
import mongoose from "mongoose";
import { isEmailAllowed } from "@/lib/config";
import { connectDb } from "@/lib/db";
import Account from "@/models/Account";
import Contact from "@/models/Contact";

// Better Auth's collections. Its "account" model (sign-in methods) is renamed so it can't be mistaken for
// the Account model (a customer: its state and usage).
export const AUTH_MODELS = {
	user: "users",
	session: "sessions",
	account: "auth_accounts",
	verification: "verifications",
};

function toObjectId(id) {
	return new mongoose.Types.ObjectId(String(id));
}

// Each user owns one account, created at their first sign-in (lib/auth.js). True when this call created it.
export async function createAccount(ownerId) {
	await connectDb();
	const id = toObjectId(ownerId);
	const { upsertedCount } = await Account.updateOne({ ownerId: id }, { $setOnInsert: { ownerId: id } }, { upsert: true });
	return upsertedCount > 0;
}

// The user's account, created here if their first sign-in didn't.
export async function ensureAccount(ownerId) {
	await createAccount(ownerId);
	return Account.findOne({ ownerId: toObjectId(ownerId) }).lean();
}

export async function findUser(userId) {
	await connectDb();
	return mongoose.connection.db
		.collection(AUTH_MODELS.user)
		.findOne({ _id: toObjectId(userId) }, { projection: { email: 1, emailVerified: 1 } });
}

// On the allowlist (lib/config.js), with an email the user proved they own.
export function isUserAllowed(user) {
	return Boolean(user?.emailVerified) && isEmailAllowed(user.email);
}

// Signed in with Google before: the account page says they can sign in either way.
export async function hasGoogleSignIn(userId) {
	await connectDb();
	const google = await mongoose.connection.db
		.collection(AUTH_MODELS.account)
		.findOne({ userId: toObjectId(userId), providerId: "google" }, { projection: { _id: 1 } });
	return Boolean(google);
}

export async function findOwnerEmail(accountId) {
	await connectDb();
	const account = await Account.findById(accountId).select({ ownerId: 1 }).lean();
	if (!account) return null;
	const user = await mongoose.connection.db
		.collection(AUTH_MODELS.user)
		.findOne({ _id: account.ownerId }, { projection: { email: 1 } });
	return user?.email ?? null;
}

// Newest first, with the owner's email and active contacts, for the admin list.
export async function listAccountsForAdmin({ limit = 200 } = {}) {
	await connectDb();
	return Account.aggregate([
		{ $sort: { createdAt: -1 } },
		{ $limit: limit },
		{
			$lookup: {
				from: AUTH_MODELS.user,
				localField: "ownerId",
				foreignField: "_id",
				pipeline: [{ $project: { email: 1 } }],
				as: "owner",
			},
		},
		{
			$lookup: {
				from: Contact.collection.collectionName,
				localField: "_id",
				foreignField: "accountId",
				pipeline: [{ $match: { status: "active" } }, { $count: "count" }],
				as: "active",
			},
		},
		{
			$set: {
				ownerEmail: { $first: "$owner.email" },
				activeContacts: { $ifNull: [{ $first: "$active.count" }, 0] },
			},
		},
		// Aggregations ignore the schema's select: false.
		{ $unset: ["owner", "active", "postshiba.bulkCredential.password"] },
	]);
}
