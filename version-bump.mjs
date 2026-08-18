/**
 * Runs from `npm version <x.y.z>`, which sets package.json's version and then invokes this
 * through the "version" lifecycle script.
 *
 * Keeps manifest.json and versions.json in step with it, so the three files that Obsidian
 * and the release workflow read can never disagree — which is the release mistake that
 * actually happens. CHANGELOG.md still needs a human, so this only warns about it.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const targetVersion = process.env.npm_package_version;

if (!targetVersion) {
    console.error('version-bump: npm_package_version is unset — run this via `npm version`, not directly.');
    process.exit(1);
}

/** Reads JSON while remembering whether the file uses tabs or spaces, so diffs stay small. */
function readJson(path) {
    const raw = readFileSync(path, 'utf8');
    const match = raw.match(/\n(\s+)"/);
    return { data: JSON.parse(raw), indent: match ? match[1] : '\t' };
}

function writeJson(path, data, indent) {
    writeFileSync(path, JSON.stringify(data, null, indent) + '\n');
}

const manifest = readJson('manifest.json');
const { minAppVersion } = manifest.data;
manifest.data.version = targetVersion;
writeJson('manifest.json', manifest.data, manifest.indent);

const versions = readJson('versions.json');
versions.data[targetVersion] = minAppVersion;
writeJson('versions.json', versions.data, versions.indent);

console.log(`version-bump: manifest.json and versions.json set to ${targetVersion} (minAppVersion ${minAppVersion})`);

if (!readFileSync('CHANGELOG.md', 'utf8').includes(`[${targetVersion}]`)) {
    console.warn(`version-bump: CHANGELOG.md has no [${targetVersion}] section yet — the release workflow pulls its notes from there.`);
}
