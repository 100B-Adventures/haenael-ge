#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "../..");
const packageJsonPath = resolve(projectRoot, "package.json");
const nextConfigPath = resolve(projectRoot, "next.config.ts");
const buildTsconfigPath = resolve(projectRoot, "tsconfig.build.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

const DEPLOY_SCRIPTS = new Set([
  "prebuild",
  "build",
  "postbuild",
  "start",
  "qa:predeploy-production",
]);

// These commands intentionally operate on the whole repository and are never
// part of the Vercel build lifecycle. Every package.json path that leaves web/
// must be named here so a new deploy-time dependency cannot appear silently.
const REPOSITORY_ONLY_EXTERNAL_SCRIPTS = new Set([
  "test:qa-contracts",
  "qa:verify-production",
  "qa:design-tokens",
]);

const SOURCE_EXTENSIONS = /\.(?:c|m)?(?:j|t)sx?$/;
const NON_RUNTIME_PATH = /(?:^|\/)(?:__tests__|stories)(?:\/|$)|\.(?:test|spec|stories)\.[^.]+$/;
function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", ".next", "coverage", "playwright-report", "test-results"].includes(entry.name)) {
      return [];
    }
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function isInsideProject(path) {
  const pathFromProject = relative(projectRoot, path);
  return pathFromProject === "" || (!pathFromProject.startsWith(`..${sep}`) && pathFromProject !== "..");
}

function parseSourceFile(path) {
  return ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function moduleSpecifiers(path) {
  const source = parseSourceFile(path);
  const specifiers = [];
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) {
      specifiers.push(node.moduleReference.expression.text);
    } else if (ts.isCallExpression(node) && node.arguments.length &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
      ts.isStringLiteralLike(node.arguments[0])) {
      specifiers.push(node.arguments[0].text);
    } else if (ts.isCallExpression(node) && node.arguments.length &&
      ts.isPropertyAccessExpression(node.expression) &&
      ((ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "require") ||
        ts.isMetaProperty(node.expression.expression)) &&
      node.expression.name.text === "resolve" && ts.isStringLiteralLike(node.arguments[0])) {
      specifiers.push(node.arguments[0].text);
    } else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
      node.expression.text === "URL" && node.arguments?.length &&
      ts.isStringLiteralLike(node.arguments[0]) && node.arguments[1] &&
      ts.isPropertyAccessExpression(node.arguments[1]) &&
      ts.isMetaProperty(node.arguments[1].expression) && node.arguments[1].name.text === "url") {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

function resolveFileSpecifier(importer, specifier) {
  if (specifier.startsWith("file:")) return fileURLToPath(specifier);
  if (isAbsolute(specifier)) return specifier;
  if (specifier.startsWith(".")) return resolve(dirname(importer), specifier);
  return null;
}

function runtimeSourceFailures() {
  const failures = [];
  const sourceFiles = walk(resolve(projectRoot, "src"))
    .filter((path) => SOURCE_EXTENSIONS.test(path))
    .filter((path) => !NON_RUNTIME_PATH.test(relative(projectRoot, path)));

  for (const path of sourceFiles) {
    for (const specifier of moduleSpecifiers(path)) {
      const target = resolveFileSpecifier(path, specifier);
      if (target && !isInsideProject(target)) {
        failures.push(`source-import-outside file=${relative(projectRoot, path)} specifier=${specifier}`);
      }
    }
  }

  const generatedFiles = sourceFiles.filter((path) => relative(projectRoot, path).includes(`${sep}generated${sep}`));
  console.log(`WEB_PACKAGE_RUNTIME_SCAN files=${sourceFiles.length} generated=${generatedFiles.length}`);
  return failures;
}

function commandLeavesProject(command) {
  return /(^|[\s"'=\\/])\.\.(?:[\\/]|(?=$)|(?=[\s&;|]))/.test(command) ||
    /(^|[\s"'=])(?:file:|\/(?!\/)|[A-Za-z]:[\\/])/.test(command);
}

function calledPackageScripts(command) {
  return [...command.matchAll(/\bnpm(?:\s+--?[A-Za-z0-9-]+(?:=[^\s]+)*)*\s+(?:run|run-script)(?:\s+--?[A-Za-z0-9-]+(?:=[^\s]+)*)*\s+([A-Za-z0-9:_-]+)/g)]
    .map((match) => match[1]);
}

function packageScriptFailures() {
  const failures = [];
  const scripts = packageJson.scripts ?? {};
  const externalScripts = Object.entries(packageJson.scripts ?? {})
    .filter(([, command]) => commandLeavesProject(command))
    .map(([name]) => name)
    .sort();

  for (const name of externalScripts) {
    if (DEPLOY_SCRIPTS.has(name)) failures.push(`deploy-script-outside script=${name}`);
    else if (!REPOSITORY_ONLY_EXTERNAL_SCRIPTS.has(name)) failures.push(`package-script-unclassified script=${name}`);
  }
  for (const deployScript of DEPLOY_SCRIPTS) {
    const queue = [deployScript];
    const visited = new Set();
    while (queue.length) {
      const current = queue.shift();
      if (visited.has(current) || !scripts[current]) continue;
      visited.add(current);
      if (current !== deployScript && externalScripts.includes(current)) {
        failures.push(`deploy-script-depends-outside script=${deployScript} dependency=${current}`);
      }
      queue.push(...calledPackageScripts(scripts[current]));
    }
  }
  console.log(`WEB_PACKAGE_SCRIPT_SCAN external=${externalScripts.join(",") || "none"}`);
  return failures;
}

function nextConfigFailures() {
  const source = parseSourceFile(nextConfigPath);
  const failures = [];
  for (const specifier of moduleSpecifiers(nextConfigPath)) {
    const target = resolveFileSpecifier(nextConfigPath, specifier);
    if (target && !isInsideProject(target)) {
      failures.push(`next-config-import-outside specifier=${specifier}`);
    }
  }
  const visitPaths = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "path" &&
      ["join", "resolve"].includes(node.expression.name.text) && node.arguments.length) {
      const [first, ...rest] = node.arguments;
      const anchoredAtProject = ts.isIdentifier(first) && first.text === "__dirname";
      if (anchoredAtProject && rest.every((argument) => ts.isStringLiteralLike(argument))) {
        const target = resolve(projectRoot, ...rest.map((argument) => argument.text));
        if (!isInsideProject(target)) failures.push(`next-config-path-outside path=${target}`);
      }
    }
    ts.forEachChild(node, visitPaths);
  };
  visitPaths(source);
  let configObject;
  const findConfig = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
      node.name.text === "nextConfig" && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      configObject = node.initializer;
    }
    ts.forEachChild(node, findConfig);
  };
  findConfig(source);
  const property = (object, name) => object?.properties.find((candidate) =>
    ts.isPropertyAssignment(candidate) &&
    ((ts.isIdentifier(candidate.name) && candidate.name.text === name) ||
      (ts.isStringLiteralLike(candidate.name) && candidate.name.text === name)));
  const turbopack = property(configObject, "turbopack")?.initializer;
  const root = turbopack && ts.isObjectLiteralExpression(turbopack)
    ? property(turbopack, "root")?.initializer
    : undefined;
  if (!root || !ts.isIdentifier(root) || root.text !== "__dirname") {
    failures.push("next-config-root-not-web file=next.config.ts");
  }
  const typescriptConfig = property(configObject, "typescript")?.initializer;
  const tsconfigPath = typescriptConfig && ts.isObjectLiteralExpression(typescriptConfig)
    ? property(typescriptConfig, "tsconfigPath")?.initializer
    : undefined;
  const tsconfigBindingValid = tsconfigPath && ts.isConditionalExpression(tsconfigPath) &&
    ts.isIdentifier(tsconfigPath.condition) && tsconfigPath.condition.text === "isDevelopment" &&
    ts.isStringLiteralLike(tsconfigPath.whenTrue) && tsconfigPath.whenTrue.text === "tsconfig.json" &&
    ts.isStringLiteralLike(tsconfigPath.whenFalse) && tsconfigPath.whenFalse.text === "tsconfig.build.json";
  if (!tsconfigBindingValid) {
    failures.push("next-config-build-tsconfig-missing file=next.config.ts");
  }
  return failures;
}

function parseJsonc(path) {
  const parsed = ts.parseConfigFileTextToJson(path, readFileSync(path, "utf8"));
  if (parsed.error) throw new Error(`cannot parse ${relative(projectRoot, path)}`);
  return parsed.config;
}

function tsconfigFailures() {
  const failures = [];
  const visited = new Set();
  const checkPath = (configPath, field, value, base = dirname(configPath)) => {
    if (typeof value !== "string") return;
    const target = value.startsWith("file:") ? fileURLToPath(value) : resolve(base, value);
    if (!isInsideProject(target)) {
      failures.push(`tsconfig-path-outside file=${relative(projectRoot, configPath)} field=${field} value=${value}`);
    }
  };
  const visit = (configPath) => {
    if (visited.has(configPath)) return;
    visited.add(configPath);
    const config = parseJsonc(configPath);
    const extended = Array.isArray(config.extends) ? config.extends : [config.extends].filter(Boolean);
    for (const value of extended) {
      if (typeof value !== "string" || (!value.startsWith(".") && !isAbsolute(value) && !value.startsWith("file:"))) continue;
      checkPath(configPath, "extends", value);
      const target = value.startsWith("file:") ? fileURLToPath(value) : resolve(dirname(configPath), value);
      const resolvedTarget = target.endsWith(".json") ? target : `${target}.json`;
      if (isInsideProject(resolvedTarget) && existsSync(resolvedTarget)) visit(resolvedTarget);
    }
    for (const field of ["include", "files"]) {
      for (const value of config[field] ?? []) checkPath(configPath, field, value);
    }
    const compilerOptions = config.compilerOptions ?? {};
    for (const field of ["baseUrl", "rootDir", "outDir", "tsBuildInfoFile"]) {
      checkPath(configPath, `compilerOptions.${field}`, compilerOptions[field]);
    }
    for (const field of ["rootDirs", "typeRoots"]) {
      for (const value of compilerOptions[field] ?? []) checkPath(configPath, `compilerOptions.${field}`, value);
    }
    const pathBase = resolve(dirname(configPath), compilerOptions.baseUrl ?? ".");
    for (const [alias, values] of Object.entries(compilerOptions.paths ?? {})) {
      for (const value of values) checkPath(configPath, `compilerOptions.paths.${alias}`, value, pathBase);
    }
    for (const reference of config.references ?? []) checkPath(configPath, "references.path", reference.path);
  };
  visit(buildTsconfigPath);
  console.log(`WEB_PACKAGE_TSCONFIG_SCAN files=${visited.size}`);
  return failures;
}

function symlinkFailures() {
  const failures = [];
  for (const path of walk(projectRoot)) {
    if (!lstatSync(path).isSymbolicLink()) continue;
    const target = realpathSync(path);
    if (!isInsideProject(target)) {
      failures.push(`package-symlink-outside file=${relative(projectRoot, path)}`);
    }
  }
  return failures;
}

const failures = [
  ...runtimeSourceFailures(),
  ...packageScriptFailures(),
  ...nextConfigFailures(),
  ...tsconfigFailures(),
  ...symlinkFailures(),
];

if (failures.length) {
  for (const failure of failures) console.error(`WEB_PACKAGE_BOUNDARY_FAIL ${failure}`);
  process.exit(1);
}

console.log("WEB_PACKAGE_BOUNDARY_PASS failures=0");
