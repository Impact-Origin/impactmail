import { useCallback } from "react";
import { toast } from "@/lib/toast";

export function useToastError() {
	return useCallback((result) => toast.error(result.error), []);
}
