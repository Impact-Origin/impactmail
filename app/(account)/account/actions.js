"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDeletionBlockers, requestDeletion } from "@/lib/account-deletion";
import { notifyActivity } from "@/lib/alerts";
import { checkDeletionCode, requireAccount, sendDeletionCodeEmail } from "@/lib/auth";
import { saveProfile } from "@/lib/profile";
import { isRateLimited } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/validation";

// Each code also dies after 3 wrong tries and 5 minutes (Better Auth's emailOTP).
const CODES_PER_ACCOUNT = { name: "deletion-code", limit: 3, window: "15 m" };
const CHECKS_PER_ACCOUNT = { name: "deletion-check", limit: 10, window: "15 m" };
const CODE_PATTERN = /^\d{6}$/;
const BLOCKED_MESSAGE = "A tua conta ainda não pode ser eliminada. Esta página diz o que tens de fazer primeiro.";

export async function updateProfile(_state, formData) {
	const { user, account } = await requireAccount();
	const result = await saveProfile({ user, account, name: formData.get("name"), image: formData.get("image") });
	if (result.ok) revalidatePath("/", "layout");
	return result;
}

export async function sendDeletionCode() {
	const { user, account } = await requireAccount();
	if (await getDeletionBlockers(account)) return { error: BLOCKED_MESSAGE };
	if (await isRateLimited({ ...CODES_PER_ACCOUNT, key: String(account._id) })) return { error: "Demasiados códigos. Tenta de novo daqui a 15 minutos." };
	try {
		await sendDeletionCodeEmail(user.email);
	} catch (error) {
		console.error("[account] Could not send a deletion code:", error.message);
		return { error: "Não foi possível enviar o código. Tenta de novo daqui a um minuto." };
	}
	return { sent: true };
}

// A session left open somewhere isn't enough: it takes a code sent for this, and the email typed out.
export async function deleteAccount(_state, formData) {
	const { user, account } = await requireAccount();
	const code = String(formData.get("code") ?? "").replace(/\s/g, "");
	if (normalizeEmail(formData.get("email")) !== normalizeEmail(user.email)) return { error: "Escreve o teu endereço de email para confirmar" };
	if (!CODE_PATTERN.test(code)) return { error: "Introduz o código de 6 dígitos" };
	if (await isRateLimited({ ...CHECKS_PER_ACCOUNT, key: String(account._id) })) return { error: "Demasiadas tentativas. Tenta de novo daqui a 15 minutos." };
	if (await getDeletionBlockers(account)) return { error: BLOCKED_MESSAGE };
	if (!(await checkDeletionCode(user.email, code))) return { error: "Este código está errado ou expirou" };
	try {
		await requestDeletion({ account, user });
	} catch (error) {
		console.error("[account] Deletion failed:", error);
		return { error: "Não foi possível eliminar a tua conta. Tenta de novo daqui a um minuto." };
	}
	await notifyActivity(["Account deleted", user.email], { accountId: account._id });
	redirect("/signin?deleted=1");
}
