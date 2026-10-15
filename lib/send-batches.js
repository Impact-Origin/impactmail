// A send goes out in batches of this many, one QStash job each.
export const SEND_BATCH_SIZE = 50;

// When each batch may start, in Unix seconds: the first right away, the last at the end of the spread, the others
// evenly between.
export function getBatchStarts(count, spreadMs, now = Date.now()) {
	return Array.from({ length: count }, (_, index) =>
		spreadMs && index > 0 ? Math.floor((now + (index * spreadMs) / (count - 1)) / 1000) : null
	);
}
