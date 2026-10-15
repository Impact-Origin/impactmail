import Link from "next/link";
import LogoImpactmail from "@/components/LogoImpactmail";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

export default function LogoWordmark({ href, className, children }) {
	const Wordmark = href ? Link : "span";

	return (
		<Wordmark href={href} className={cn("flex items-center gap-2", className)}>
			<LogoImpactmail />
			<span className="text-[17px] font-semibold tracking-tight">{APP_NAME}</span>
			{children}
		</Wordmark>
	);
}
