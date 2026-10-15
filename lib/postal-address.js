// The postal address a newsletter's emails print. Sending waits until there's one.
export function getPostalAddress(newsletter) {
	return String(newsletter?.postalAddress ?? "").trim();
}

// What saving an address stores.
export function toPostalAddressFields(address) {
	const text = String(address ?? "").trim();
	return { postalAddress: text, postalAddressCleared: !text };
}
