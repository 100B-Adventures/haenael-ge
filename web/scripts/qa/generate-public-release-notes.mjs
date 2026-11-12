#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../..");
const releasePath = resolve(repoRoot, "RELEASE.md");
const outputPath = resolve(repoRoot, "web/src/generated/public-release-notes.json");

function parseScalar(raw) {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  return value;
}

export function parsePublicReleaseNotes(markdown) {
  const headings = [...markdown.matchAll(/^# 릴리스(?: 후보)? 매니페스트: 해낼게 (\d+\.\d+\.\d+)$/gm)];
  const releases = [];

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const version = heading[1];
    const blockEnd = headings[index + 1]?.index ?? markdown.length;
    const section = markdown.slice(heading.index, blockEnd);
    const yaml = section.match(/```yaml\n([\s\S]*?)\n```/)?.[1];
    if (!yaml) continue;

    const values = {};
    const note = {};
    let inPublicNote = false;
    for (const line of yaml.split("\n")) {
      if (/^public_note:\s*$/.test(line)) {
        inPublicNote = true;
        continue;
      }
      if (inPublicNote && /^  [a-z_]+:/.test(line)) {
        const [, key, raw] = line.match(/^  ([a-z_]+):\s*(.*)$/) ?? [];
        if (key) note[key] = parseScalar(raw);
        continue;
      }
      if (/^[a-z_]+:/.test(line)) {
        inPublicNote = false;
        const [, key, raw] = line.match(/^([a-z_]+):\s*(.*)$/) ?? [];
        if (key) values[key] = parseScalar(raw);
      }
    }

    if (!values.release_tag || Object.keys(note).length === 0) continue;
    if (values.release !== version) {
      throw new Error(`release heading/version mismatch: ${version} != ${values.release}`);
    }
    if (!String(values.release_tag).startsWith(`${version}+`)) {
      throw new Error(`release_tag must start with ${version}+: ${values.release_tag}`);
    }
    for (const key of ["title", "summary", "notify", "try_href", "feedback_href"]) {
      if (note[key] === undefined || note[key] === "") {
        throw new Error(`${version} public_note.${key} is required`);
      }
    }

    releases.push({
      version,
      releaseTag: values.release_tag,
      date: values.date,
      title: note.title,
      summary: note.summary,
      notify: note.notify,
      tryHref: note.try_href,
      feedbackHref: note.feedback_href,
    });
  }

  return releases
    .filter(({ version }) => version.localeCompare("2.1.3", undefined, { numeric: true }) >= 0)
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))
    .slice(0, 3);
}

const releaseNotes = parsePublicReleaseNotes(readFileSync(releasePath, "utf8"));
if (releaseNotes.length !== 3 || releaseNotes[0]?.version !== "2.1.5") {
  throw new Error(`expected newest three public releases from 2.1.5, received ${releaseNotes.map(({ version }) => version).join(", ")}`);
}

const generated = `${JSON.stringify({ source: "RELEASE.md", releases: releaseNotes }, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = readFileSync(outputPath, "utf8");
  if (current !== generated) {
    throw new Error("public release notes are stale; run node scripts/qa/generate-public-release-notes.mjs");
  }
  console.log("PUBLIC_RELEASE_NOTES_OK releases=3 source=RELEASE.md");
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, generated, "utf8");
  console.log(`PUBLIC_RELEASE_NOTES_GENERATED releases=${releaseNotes.length}`);
}
