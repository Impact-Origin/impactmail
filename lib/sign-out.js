// Fired on the window once someone agrees to sign out, so what the browser keeps for them can forget it.
export const SIGN_OUT_EVENT = "impactmail:sign-out";

// Every way to sign out asks first: the buttons (ButtonSignout) and the account menu (MenuUser).
export function askToSignOut() {
	if (!window.confirm("Sign out of ImpactMail?")) return false;
	window.dispatchEvent(new Event(SIGN_OUT_EVENT));
	return true;
}
