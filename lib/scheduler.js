const HOUR_MS = 3_600_000;
const FIRST_RUN_DELAY_MS = 60_000;

const JOBS = [
	{ path: "/api/cron/hourly", everyMs: HOUR_MS },
	{ path: "/api/cron/postmaster", everyMs: 24 * HOUR_MS },
];

// A server that runs for good, as on Railway, calls its own cron routes: no outside scheduler to set up. Off without
// CRON_SECRET, which the routes need, or with SCHEDULER=off when something else calls them. With more than one replica,
// each one runs them: the routes are safe to run twice, but one replica is enough.
export function getScheduledJobs(env = process.env) {
	if (!env.CRON_SECRET || env.SCHEDULER === "off") return [];
	const base = `http://127.0.0.1:${env.PORT || 3000}`;
	return JOBS.map((job) => ({ ...job, url: `${base}${job.path}` }));
}

async function runJob({ url, path }, secret) {
	try {
		const response = await fetch(url, { headers: { authorization: `Bearer ${secret}` } });
		if (!response.ok) console.error(`[scheduler] ${path} answered ${response.status}`);
	} catch (error) {
		console.error(`[scheduler] ${path} failed: ${error.message}`);
	}
}

export function startScheduler(env = process.env) {
	const jobs = getScheduledJobs(env);
	for (const job of jobs) {
		setTimeout(() => runJob(job, env.CRON_SECRET), FIRST_RUN_DELAY_MS).unref?.();
		setInterval(() => runJob(job, env.CRON_SECRET), job.everyMs).unref?.();
	}
	return jobs.map(({ path }) => path);
}
