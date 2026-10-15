import "server-only";
import { sendAlert } from "@/lib/alerts";
import { getEmailProvider, getProvider } from "@/lib/email-provider";

// One tenant per account at the email provider (lib/email-provider): its own domains, suppressions and
// pause switch. Created by the account's first send or domain.
export function getTenant(account) {
	return getEmailProvider().getTenant(account);
}

export function provisionTenant(accountId) {
	return getEmailProvider().provisionTenant(accountId);
}

export function ensureTenant(account) {
	return getEmailProvider().ensureTenant(account);
}

// A blocked or deleted account's tenant stops at the provider too, where the provider supports it. ImpactMail's own
// block already stops its sends, so a provider that doesn't answer is reported, not retried.
export async function suspendTenantQuietly(accountId) {
	const provider = getEmailProvider();
	try {
		await provider.suspendTenant(accountId);
	} catch (error) {
		console.error(`[tenants] ${provider.name} didn't suspend account ${accountId}: ${error.message}`);
		await sendAlert({
			accountId: null,
			key: `tenant-suspend-failed:${accountId}`,
			title: `Tenant na ${provider.name} não suspenso`,
			detail: `A conta ${accountId} está parada no ImpactMail, mas a ${provider.name} não suspendeu o tenant: ${error.message}`,
			action: `O ImpactMail não tenta de novo: suspende-o à mão na ${provider.name}.`,
			path: "/admin",
		});
	}
}

// An admin unblocking an account: the provider lifts its own pause on the tenant, or throws why it can't.
export function resumeTenant(accountId) {
	return getEmailProvider().resumeTenant(accountId);
}

// An account restored before its purge. A provider that refuses (a hold of its abuse team) is reported: the
// account stays stopped there until an admin sorts it out.
export async function resumeTenantQuietly(accountId) {
	const provider = getEmailProvider();
	try {
		await provider.resumeTenant(accountId);
	} catch (error) {
		console.error(`[tenants] ${provider.name} didn't resume account ${accountId}: ${error.message}`);
		await sendAlert({
			accountId: null,
			key: `tenant-resume-failed:${accountId}`,
			title: `Tenant na ${provider.name} não retomado`,
			detail: `A conta ${accountId} foi restaurada depois de o dono a eliminar, mas a ${provider.name} não retomou o tenant: ${error.message}`,
			action: `Não pode enviar até o tenant ser retomado na ${provider.name}.`,
			path: "/admin",
		});
	}
}

// An account's purge, once its domains are gone: its tenant at every provider it has one at. A provider that
// isn't the active one may not be set up any longer, so only the active one's failure stops the purge.
export async function removeTenants(account) {
	const active = getEmailProvider();
	for (const provider of [getProvider("postshiba"), getProvider("ses")]) {
		try {
			await provider.removeTenant(account);
		} catch (error) {
			if (provider === active) throw error;
			console.error(`[tenants] ${provider.name} still has account ${account._id}'s tenant: ${error.message}`);
		}
	}
}
