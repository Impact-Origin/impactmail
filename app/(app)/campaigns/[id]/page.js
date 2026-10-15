import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import CampaignReport from "@/components/CampaignReport";
import FormCampaign from "@/components/FormCampaign";
import { scoped } from "@/lib/account-scope";
import { getAccountSendProblem, isBlocked } from "@/lib/account-state";
import { getArchiveUrls } from "@/lib/archive-hosts";
import { countNewContacts, sendTimesPipeline } from "@/lib/campaign-queries";
import { isSendingEnabled } from "@/lib/config";
import { MESSAGE_STATS_GROUP } from "@/lib/message-stats";
import { getPostalAddress } from "@/lib/postal-address";
import { getSelectedNewsletter, openNewsletter } from "@/lib/selected-newsletter";
import { serialize } from "@/lib/serialize";
import { loadSender } from "@/lib/sender";
import Campaign from "@/models/Campaign";
import Contact from "@/models/Contact";
import Message from "@/models/Message";
import Newsletter from "@/models/Newsletter";

export const metadata = { title: "Campaign" };

export default async function CampaignPage({ params }) {
	const [{ id }, view] = await Promise.all([params, getSelectedNewsletter()]);
	const { user, account } = view;
	if (!isValidObjectId(id)) notFound();

	const campaign = await Campaign.findOne(scoped(account, { _id: id })).lean();
	if (!campaign) notFound();
	openNewsletter(view, campaign.newsletterId, `/campaigns/${id}`);
	const stored = await Newsletter.findOne(scoped(account, { _id: campaign.newsletterId })).lean();
	if (!stored) notFound();
	// The previews and the checks show the address its emails print.
	const newsletter = { ...stored, postalAddress: getPostalAddress(stored) };

	if (!["draft", "scheduled"].includes(campaign.status)) {
		const [providers, remainingCount] = await Promise.all([
			getProviderBreakdown(campaign),
			countRemaining(campaign),
		]);
		// Only a next step needs them, for what its dialog says.
		const newContacts = remainingCount > 0 ? await countNewContacts(account, newsletter._id) : 0;
		return (
			<CampaignReport
				campaign={serialize(campaign)}
				newsletter={serialize(newsletter)}
				providers={providers}
				remainingCount={remainingCount}
				isBlocked={isBlocked(account)}
				newContacts={newContacts}
			/>
		);
	}

	const [audienceCount, sender, sendTimes, newContacts] = await Promise.all([
		Contact.countDocuments(scoped(account, { newsletterId: newsletter._id, status: "active" })),
		loadSender(account, newsletter),
		getSendTimes(campaign),
		countNewContacts(account, newsletter._id),
	]);

	return (
		<FormCampaign
			campaign={serialize(campaign)}
			newsletter={serialize(newsletter)}
			audienceCount={audienceCount}
			senderProblem={sender.problem ?? null}
			isSendingEnabled={isSendingEnabled()}
			testEmail={user.email}
			sendTimes={sendTimes}
			archiveUrlBase={newsletter.archiveEnabled ? getArchiveUrls(newsletter).absolutePost("") : null}
			accountProblem={getAccountSendProblem(account)?.message ?? null}
			newContacts={newContacts}
		/>
	);
}

// A newsletter's first issue borrows the times the account's other newsletters go out.
async function getSendTimes(campaign) {
	const { accountId } = campaign;
	const own = await Campaign.aggregate(
		sendTimesPipeline({ accountId, newsletterId: campaign.newsletterId, excludeId: campaign._id })
	);
	const rows = own.length > 0 ? own : await Campaign.aggregate(sendTimesPipeline({ accountId, excludeId: campaign._id }));
	return {
		history: rows.map(({ at }) => at.toISOString()),
		taken: own.filter(({ status }) => status === "scheduled").map(({ at }) => at.toISOString()),
	};
}

// Only a send capped to the most engaged has a next step. Close enough for the dialog: contacts who
// left after receiving it make this a little low, and the send itself skips everyone who has it.
async function countRemaining(campaign) {
	if (campaign.status !== "sent" || !campaign.audienceLimit) return 0;
	const active = await Contact.countDocuments({
		accountId: campaign.accountId,
		newsletterId: campaign.newsletterId,
		status: "active",
	});
	const reached = (campaign.stats?.recipients ?? 0) + (campaign.lastChance?.recipients ?? 0);
	return Math.max(0, active - reached);
}

async function getProviderBreakdown(campaign) {
	const rows = await Message.aggregate([
		{ $match: { accountId: campaign.accountId, campaignId: campaign._id, kind: "campaign" } },
		{ $group: { _id: { $ifNull: ["$provider", "other"] }, ...MESSAGE_STATS_GROUP } },
		{ $sort: { sent: -1 } },
	]);
	return rows.filter(({ sent }) => sent > 0).map(({ _id, ...row }) => ({ provider: _id, ...row }));
}
