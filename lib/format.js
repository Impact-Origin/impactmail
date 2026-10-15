// The app's language: dates, numbers and the copy are in European Portuguese.
export const LOCALE = "pt-PT";

const numberFormat = new Intl.NumberFormat(LOCALE);
const compactFormat = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });
const WINDOWS = { "1 m": "por minuto", "1 h": "por hora", "1 d": "por dia" };

export function formatNumber(value) {
	return numberFormat.format(value || 0);
}

// 0.0008 -> "0,08%"
export function formatPercent(rate) {
	return `${numberFormat.format(Number((rate * 100).toFixed(2)))}%`;
}

// "1 contacto", "2239 contactos"; plural for nouns that don't just take an s: "subscritor", "subscritores".
export function formatCount(value, singular, plural = `${singular}s`) {
	return `${formatNumber(value)} ${value === 1 ? singular : plural}`;
}

export function formatCompact(value) {
	return compactFormat.format(value || 0);
}

// A rate limit's window, in Upstash's format: "1 h" -> "por hora".
export function formatWindow(value) {
	return WINDOWS[value] ?? value;
}

// The format helpers return null for a missing value; pages show it with TextEmpty.
export function formatRate(part, total, digits = 1) {
	const value = Number(part);
	if (!total || part === undefined || part === null || !Number.isFinite(value)) return null;
	return `${((value / total) * 100).toFixed(digits).replace(".", ",")}%`;
}

// "Uma ideia por semana" -> "Uma ideia por semana."; "Quem vem?" stays as it is.
export function formatSentence(text) {
	const sentence = String(text ?? "").replace(/\s+/g, " ").trim();
	return !sentence || /[.!?…]["'”’)]*$/.test(sentence) ? sentence : `${sentence}.`;
}

// "+1204", "−32", "0"
export function formatSigned(value) {
	const sign = value > 0 ? "+" : value < 0 ? "−" : "";
	return `${sign}${formatNumber(Math.abs(value))}`;
}

// "+8%" for a count; for a rate, the difference between the two rates: 41,8% then 39,1% is "−2,7%".
export function formatChange(value, { digits = 0 } = {}) {
	if (value === null || value === undefined || !Number.isFinite(value)) return null;
	const rounded = Number(value.toFixed(digits));
	const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
	return `${sign}${Math.abs(rounded).toFixed(digits).replace(".", ",")}%`;
}

// "14h" for 14.
export function formatHour(hour) {
	return `${hour}h`;
}

export function currentYear() {
	return new Date().getFullYear();
}

export function formatDate(value) {
	if (!value) return null;
	return new Date(value).toLocaleDateString(LOCALE, { month: "short", day: "numeric", year: "numeric" });
}

// "qua., 7/10, 16:00" in the browser's timezone; on the server it would be UTC.
export function formatSendTime(value) {
	return new Date(value).toLocaleString(LOCALE, {
		weekday: "short",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export function formatRelative(value, now = Date.now()) {
	if (!value) return null;
	const seconds = Math.round((now - new Date(value).getTime()) / 1000);
	if (seconds < 60) return "agora mesmo";
	const units = [
		["ano", "anos", 31536000],
		["mês", "meses", 2592000],
		["dia", "dias", 86400],
		["hora", "horas", 3600],
		["minuto", "minutos", 60],
	];
	const [singular, plural, size] = units.find(([, , size]) => seconds >= size);
	const amount = Math.floor(seconds / size);
	return `há ${formatCount(amount, singular, plural)}`;
}
