import { FIRST_SEND } from "@/lib/config";
import { formatNumber } from "@/lib/format";

// In the send and schedule dialogs when more contacts than a first slice never got an email (lib/first-send.js).
export default function NoticeFirstSend({ count }) {
	return (
		<p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-pretty tabular-nums">
			{formatNumber(count)} contactos nunca receberam um email teu. Uma parte deles recebe primeiro, e os restantes{" "}
			{FIRST_SEND.waitMinutes / 60} horas depois, se as devoluções e denúncias se mantiverem baixas. Se não, os restantes esperam
			que retomes o envio e, se estiverem muito acima, a tua conta é bloqueada.
		</p>
	);
}
