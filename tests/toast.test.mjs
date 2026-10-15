import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { toast as hotToast } from "react-hot-toast";
import Toaster from "../components/Toaster.jsx";
import { toast } from "../lib/toast.js";
import { useToastError } from "../lib/use-toast-error.js";

// The app's toasts: react-hot-toast through lib/toast.js only, shown top center by components/Toaster.jsx, with a
// description and an action button where a toast has one.
const ROOT = fileURLToPath(new URL("../", import.meta.url));

beforeEach(() => hotToast.remove());

function renderToaster() {
	return renderToStaticMarkup(createElement(Toaster));
}

// Newest first, each as the words a reader sees and its button's label.
function readToasts() {
	return [...renderToaster().matchAll(/<div[^>]*role="status"[^>]*>(.*?)<\/div>(?:<button[^>]*>(.*?)<\/button>)?/gs)].map(
		([, text, action]) => ({ text: text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), action: action ?? null })
	);
}

describe("toasts", () => {
	test("every toast goes through lib/toast.js, and the root layout shows them once", async () => {
		const importers = [];
		for (const folder of ["app", "components", "lib"]) {
			for (const file of await readdir(join(ROOT, folder), { recursive: true })) {
				if (!/\.jsx?$/.test(file)) continue;
				if (/from "react-hot-toast"/.test(await readFile(join(ROOT, folder, file), "utf8"))) importers.push(`${folder}/${file}`);
			}
		}
		assert.deepEqual(importers.sort(), ["components/Toaster.jsx", "lib/toast.js"]);
		assert.equal((await readFile(join(ROOT, "app/layout.js"), "utf8")).match(/<Toaster\b/g).length, 1);
	});

	test("they show top center, under the plan's banner, in the theme's colors", () => {
		toast.message("Some records aren't there yet");
		const html = renderToaster();
		assert.match(html, /^<div[^>]*style="[^"]*top:calc\(var\(--plan-bar-height\) \+ 1rem\)/);
		assert.match(html, /justify-content:center/);
		assert.match(html, /class="[^"]*\btoast\b/);
	});

	test("a toast shows its message, its description and its action's button", () => {
		toast.success("Draft saved", { description: "It goes out on Monday at 9:00", action: { label: "View", onClick() {} } });
		toast.error("Não foi possível ler este ficheiro");
		assert.deepEqual(readToasts(), [
			{ text: "Não foi possível ler este ficheiro", action: null },
			{ text: "Draft saved It goes out on Monday at 9:00", action: "View" },
		]);
	});

	test("a promise's toast loads, then turns into its success or its error in place", async () => {
		const saving = Promise.resolve();
		toast.promise(saving, { loading: "Saving", success: "Saved", error: "Not saved" });
		assert.deepEqual(readToasts(), [{ text: "Saving", action: null }]);
		await saving;
		assert.deepEqual(readToasts(), [{ text: "Saved", action: null }]);

		hotToast.remove();
		toast.promise(Promise.reject(new Error("The network is down")), { loading: "Saving", error: (error) => error.message });
		await new Promise(setImmediate);
		assert.deepEqual(readToasts(), [{ text: "The network is down", action: null }]);
	});
});

describe("errors", () => {
	// As a dashboard component shows a failed action's result.
	function showError(result) {
		function Probe() {
			useToastError()(result);
			return null;
		}
		renderToStaticMarkup(createElement(Probe));
	}

	test("a failed action's error is a plain toast", () => {
		showError({ error: "Sending is paused", code: "account_blocked" });
		assert.deepEqual(readToasts(), [{ text: "Sending is paused", action: null }]);
	});
});

