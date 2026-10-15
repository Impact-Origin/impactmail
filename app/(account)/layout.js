import LayoutDashboard from "@/components/LayoutDashboard";
import { isAdmin, requireAccount } from "@/lib/auth";

// The account page only needs a sign-in, and skips the newsletter setup.
export default async function AccountLayout({ children }) {
	const { user, account } = await requireAccount();

	return (
		<LayoutDashboard user={user} account={account} isAdmin={isAdmin(user)}>
			{children}
		</LayoutDashboard>
	);
}
