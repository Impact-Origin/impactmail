import { cn } from "@/lib/utils";

// A point of origin and the waves of its impact. The share images draw the same shapes, so they import these.
export const LOGO_VIEWBOX = "4 4 40 40";
export const LOGO_FACETS = {
	upper: "M7 34a7 7 0 1 0 14 0a7 7 0 1 0-14 0Z",
	lower: "M14 17A17 17 0 0 1 31 34H26A12 12 0 0 0 14 22ZM14 7A27 27 0 0 1 41 34H36A22 22 0 0 0 14 12Z",
};
export const LOGO_SHADE = 0.45;

export default function LogoImpactmail({ className }) {
	return (
		<svg viewBox={LOGO_VIEWBOX} aria-hidden="true" className={cn("size-6 shrink-0 text-foreground", className)}>
			<path d={LOGO_FACETS.upper} fill="currentColor" />
			<path d={LOGO_FACETS.lower} fill="currentColor" fillOpacity={LOGO_SHADE} />
		</svg>
	);
}
