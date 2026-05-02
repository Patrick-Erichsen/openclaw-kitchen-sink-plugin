#!/usr/bin/env node

import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const packageJson = JSON.parse(await fs.readFile(path.join(repoRoot, "package.json"), "utf8"));
const pluginJson = JSON.parse(await fs.readFile(path.join(repoRoot, "openclaw.plugin.json"), "utf8"));
const packageVersion = packageJson.version;
const pluginId = pluginJson.id;
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

if (pluginId !== "openclaw-kitchen-sink-fixture") {
  throw new Error(`unexpected plugin id: ${pluginId}`);
}
if (typeof packageVersion !== "string" || packageVersion.trim().length === 0) {
  throw new Error("package.json version must be a non-empty string");
}

const distDir = path.join(repoRoot, "dist");
const zipName = `${pluginId}-${packageVersion}.zip`;
const zipPath = path.join(distDir, zipName);
const entries = [
  "package.json",
  "openclaw.plugin.json",
  "plugin-inspector.config.json",
  "README.md",
  ...(await listFiles("src")),
];

await fs.mkdir(distDir, { recursive: true });
await fs.writeFile(zipPath, await createZip(entries));

console.log(`Wrote ${path.relative(repoRoot, zipPath)} (${entries.length} files)`);

async function listFiles(root) {
  const files = [];
  const stack = [root];

  while (stack.length > 0) {
    const relativeDir = stack.pop();
    const dirents = await fs.readdir(path.join(repoRoot, relativeDir), { withFileTypes: true });
    for (const dirent of dirents.sort((left, right) => left.name.localeCompare(right.name))) {
      const relativePath = path.posix.join(relativeDir, dirent.name);
      if (dirent.isDirectory()) {
        stack.push(relativePath);
      } else if (dirent.isFile()) {
        files.push(relativePath);
      }
    }
  }

  return files.sort();
}

async function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const relativePath of files) {
    if (relativePath.startsWith("/") || relativePath.includes("..")) {
      throw new Error(`invalid zip entry path: ${relativePath}`);
    }

    const data = await fs.readFile(path.join(repoRoot, relativePath));
    const name = Buffer.from(relativePath, "utf8");
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
