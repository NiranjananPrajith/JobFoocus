#!/usr/bin/env node

// scripts/check-theme-tokens.mjs
//
// Theme Token Enforcement
// Scans src/ for hardcoded colors and non-themable classes that break dark mode.
// Exits with code 1 on any violation.
//
// Usage: node scripts/check-theme-tokens.mjs [--json]

import { readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, relative, extname } from "path";

const SRC_DIR = join(process.cwd(), "src");
const JSON_OUTPUT = process.argv.includes("--json");

// ============================================
// ALLOWLIST — exceptions that are intentionally non-themable
// ============================================

const FILE_ALLOWLIST = new Set([
  // Demo/illustration graphics — intentionally hardcoded
  "src/components/ResumeSkeletonCard.tsx",
  "src/components/JobApplicationWorkflow/index.tsx",
]);

// Per-file inline pattern exceptions (regex → reason)
const INLINE_ALLOWLIST = [
  // Switch thumbs should stay white in both modes
  { file: "AccountAutoRenewToggle.tsx", pattern: /bg-white/, reason: "switch thumb — stays white" },
  // macOS traffic-light dots in browser mockups
  { file: null, pattern: /#ef4444|#eab308|#22c55e|#ff5f57|#febc2e|#28c840/, reason: "macOS traffic-light dots — brand-stable" },
  // User-provided category colors — can't be themed
  { file: null, pattern: /cat\.color/, reason: "user-provided category color — can't theme" },
  { file: null, pattern: /color:\s*cat\.color/, reason: "user-provided category color — can't theme" },
  // Status colors — intentionally stable across themes
  { file: null, pattern: /statusColors/, reason: "status color palette — intentionally stable" },
  // Pulsing dot animation on card — stays white
  { file: "ApplicationCard.tsx", pattern: /bg-white animate-pulse/, reason: "loading pulse dot — stays white" },
  { file: "KanbanCard.tsx", pattern: /bg-white animate-pulse/, reason: "loading pulse dot — stays white" },
];

// ============================================
// PATTERNS TO FLAG
// ============================================

// ============================================
// DARK MODE OVERRIDE RULE
// ============================================

// Flags `dark:bg-*`, `dark:text-*`, `dark:border-*` Tailwind overrides.
// These are almost always redundant when using the CSS variable system
// (e.g. bg-cream auto-switches via var(--cream)). Legitimate exceptions
// (dark:shadow-*, dark:hidden, dark:lg:block, dark:hover:*) are allowlisted.
const DARK_OVERRIDE_PATTERN = /\bdark:(bg|text|border)-[a-z]/;
const DARK_OVERRIDE_ALLOWLIST = [
  // Visibility toggles — show element only in one theme
  { pattern: /dark:hidden/, reason: "visibility toggle" },
  { pattern: /dark:block/, reason: "visibility toggle" },
  { pattern: /dark:lg:block/, reason: "responsive visibility toggle" },
  // Shadows — no CSS variable, different depth per theme
  { pattern: /dark:shadow-/, reason: "shadow depth override — no CSS variable" },
  // Hover states — separate interaction, not a theme override
  { pattern: /dark:hover:/, reason: "hover state — separate concern" },
  // Intentional border contrast adjustments in dark mode
  { pattern: /dark:border-hairline-strong/, reason: "intentional stronger border in dark mode" },
  { pattern: /dark:border-hairline[^-]/, reason: "intentional border contrast in dark mode" },
  // Intentional color shifts for better dark-mode contrast (e.g. primary → sunshine)
  { pattern: /dark:text-sunshine/, reason: "intentional color shift for dark-mode contrast" },
];

// ============================================
// PATTERNS TO FLAG
// ============================================

const RULES = [
  {
    name: "bg-white",
    pattern: /\bbg-white\b/,
    message: "Use bg-canvas or bg-surface instead of bg-white",
  },
  {
    name: "bg-stone-50",
    pattern: /\bbg-stone-50\b/,
    message: "Use bg-canvas instead of bg-stone-50",
  },
  {
    name: "bg-stone-100",
    pattern: /\bbg-stone-100\b/,
    message: "Use bg-surface or bg-surface-elevated instead of bg-stone-100",
  },
  {
    name: "bg-stone-200",
    pattern: /\bbg-stone-200\b/,
    message: "Use bg-surface-elevated or bg-cream-deeper instead of bg-stone-200",
  },
  {
    name: "border-stone-200",
    pattern: /\bborder-stone-200\b/,
    message: "Use border-hairline instead of border-stone-200",
  },
  {
    name: "border-stone-300",
    pattern: /\bborder-stone-300\b/,
    message: "Use border-hairline-strong instead of border-stone-300",
  },
  {
    name: "text-stone-400",
    pattern: /\btext-stone-400\b/,
    message: "Use text-steel or text-muted instead of text-stone-400",
  },
  {
    name: "text-stone-500",
    pattern: /\btext-stone-500\b/,
    message: "Use text-steel instead of text-stone-500",
  },
  {
    name: "text-stone-700",
    pattern: /\btext-stone-700\b/,
    message: "Use text-slate or text-ink instead of text-stone-700",
  },
  {
    name: "bg-hex",
    pattern: /bg-\[#[0-9a-fA-F]+\]/,
    message: "Use a semantic token (bg-canvas, bg-surface, bg-cream, etc.) instead of a hex color",
  },
  {
    name: "text-hex",
    pattern: /text-\[#[0-9a-fA-F]+\]/,
    message: "Use a semantic token (text-ink, text-steel, text-primary, etc.) instead of a hex color",
  },
  {
    name: "border-hex",
    pattern: /border-\[#[0-9a-fA-F]+\]/,
    message: "Use a semantic token (border-hairline, border-primary, etc.) instead of a hex color",
  },
  {
    name: "inline-color-hex",
    pattern: /style=\{\{[^}]*color:\s*['"]#/,
    message: "Use var(--token) or a Tailwind class instead of a hardcoded hex in style",
  },
  {
    name: "inline-bg-hex",
    pattern: /style=\{\{[^}]*backgroundColor:\s*['"]#/,
    message: "Use var(--token) or a Tailwind class instead of a hardcoded hex in style",
  },
  {
    name: "inline-color-no-var",
    pattern: /style=\{\{[^}]*color:\s*['"](?!var\()((?!inherit|currentColor|transparent|white|black)[a-zA-Z])/,
    message: "Use var(--token) or a Tailwind class instead of a hardcoded string in style",
  },
  {
    name: "inline-bg-no-var",
    pattern: /style=\{\{[^}]*backgroundColor:\s*['"](?!var\()((?!inherit|currentColor|transparent|white|black)[a-zA-Z])/,
    message: "Use var(--token) or a Tailwind class instead of a hardcoded string in style",
  },
];

// ============================================
// FILE WALKER
// ============================================

function walkDir(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, files);
    } else if (extname(entry) === ".tsx" || extname(entry) === ".ts") {
      files.push(fullPath);
    }
  }
  return files;
}

// ============================================
// MAIN
// ============================================

const files = walkDir(SRC_DIR);
const violations = [];

for (const filePath of files) {
  const relPath = relative(process.cwd(), filePath);

  // Skip entirely allowlisted files
  if (FILE_ALLOWLIST.has(relPath)) continue;

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (const rule of RULES) {
      if (!rule.pattern.test(line)) continue;

      // Check inline allowlist
      let allowlisted = false;
      for (const ex of INLINE_ALLOWLIST) {
        if (ex.pattern.test(line)) {
          if (!ex.file || relPath.includes(ex.file)) {
            allowlisted = true;
            break;
          }
        }
      }
      if (allowlisted) continue;

      violations.push({
        file: relPath,
        line: lineNum,
        rule: rule.name,
        message: rule.message,
        snippet: line.trim().slice(0, 120),
      });
    }

    // Dark mode override check — flag dark:bg-*, dark:text-*, dark:border-*
    // that should be replaced with semantic CSS variables.
    if (DARK_OVERRIDE_PATTERN.test(line)) {
      let darkAllowlisted = false;
      for (const ex of DARK_OVERRIDE_ALLOWLIST) {
        if (ex.pattern.test(line)) {
          darkAllowlisted = true;
          break;
        }
      }
      if (!darkAllowlisted) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: "dark-override",
          message:
            "Redundant dark: override. Use a semantic CSS variable that auto-switches (e.g. bg-cream, text-ink, border-hairline) instead of dark:bg-*, dark:text-*, dark:border-*.",
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  }
}

// ============================================
// OUTPUT
// ============================================

if (JSON_OUTPUT) {
  writeFileSync("theme-lint-report.json", JSON.stringify(violations, null, 2));
  console.log(`Found ${violations.length} violation(s). Report written to theme-lint-report.json`);
} else if (violations.length === 0) {
  console.log("Theme token check passed — no violations found.");
} else {
  console.error(`\nTheme token enforcement: ${violations.length} violation(s) found:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}]`);
    console.error(`    ${v.message}`);
    console.error(`    > ${v.snippet}`);
    console.error();
  }
  console.error(
    "Fix these by replacing hardcoded colors with semantic tokens.\n" +
    "See DESIGN.md for the full token list and allowed exceptions.\n" +
    "To add a file to the allowlist, edit scripts/check-theme-tokens.mjs.\n"
  );
}

process.exit(violations.length > 0 ? 1 : 0);
