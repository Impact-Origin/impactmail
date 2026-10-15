"use server";

import { revalidatePath } from "next/cache";
import { runDashboardAction, toFormError } from "@/lib/actions/dashboard";

// SES or Vercel not answering gets a retry hint instead of their error.
function toDomainError(failure, label) {
	const isOurSide = ["internal_error", "unavailable"].includes(failure.code);
	return isOurSide ? { error: `${label} falhou, tenta de novo daqui a um minuto` } : toFormError(failure);
}

export async function addDomainAction(_state, formData) {
	const { output, failure } = await runDashboardAction("add_domain", {
		domain: String(formData.get("domain") ?? ""),
		archiveHost: String(formData.get("archiveHost") ?? ""),
	});
	revalidatePath("/domains");
	return failure ? toDomainError(failure, "A adição do domínio") : { ok: true, domain: output.domain };
}

export async function checkDomainAction(domainId) {
	const { output, failure } = await runDashboardAction("check_domain", { id: String(domainId) });
	revalidatePath("/domains");
	if (failure) return toDomainError(failure, "A verificação do domínio");
	return { ok: true, verified: output.verified, archiveHostVerified: output.archiveHostVerified };
}

export async function removeDomainAction(domainId) {
	const { output, failure } = await runDashboardAction("remove_domain", { id: String(domainId) });
	revalidatePath("/domains");
	return failure ? toDomainError(failure, "A remoção do domínio") : { ok: true, removed: output.removed };
}

// update_newsletter takes an address at any domain the account added; switching from here waits until it's verified.
export async function switchToDomainAction(_state, formData) {
	const listed = await runDashboardAction("list_domains");
	if (listed.failure) return toFormError(listed.failure);
	const domain = listed.output.domains.find(({ id }) => id === String(formData.get("domainId") ?? ""));
	if (!domain) return { error: "Domínio não encontrado" };
	if (!domain.verified) return { error: `${domain.domain} ainda não está verificado` };
	const { output, failure } = await runDashboardAction("update_newsletter", {
		id: String(formData.get("newsletterId") ?? ""),
		fromEmail: `${String(formData.get("localPart") ?? "").trim()}@${domain.domain}`,
	});
	revalidatePath("/domains");
	return failure ? toFormError(failure) : { ok: true, fromEmail: output.fromEmail };
}
