const fs = require("fs");
const path = require("path");
const swaggerSpec = require("../src/config/swagger");

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];
const routesDirectory = path.join(__dirname, "..", "src", "routes");

function openApiPath(expressPath) {
  return `/api${String(expressPath).replace(/:([A-Za-z0-9_]+)/g, "{$1}")}`;
}

function collectRouterOperations(stack, operations, sourceFile) {
  for (const layer of stack || []) {
    if (layer.route) {
      const routePaths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const routePath of routePaths) {
        for (const method of Object.keys(layer.route.methods || {})) {
          if (HTTP_METHODS.includes(method)) operations.set(`${method.toUpperCase()} ${openApiPath(routePath)}`, sourceFile);
        }
      }
    } else if (layer.handle?.stack) {
      collectRouterOperations(layer.handle.stack, operations, sourceFile);
    }
  }
}

function findLocalReference(spec, reference) {
  if (!reference.startsWith("#/")) return true;
  let current = spec;
  for (const encodedPart of reference.slice(2).split("/")) {
    const part = encodedPart.replace(/~1/g, "/").replace(/~0/g, "~");
    current = current?.[part];
  }
  return current !== undefined;
}

function collectReferences(value, references = new Set()) {
  if (!value || typeof value !== "object") return references;
  if (typeof value.$ref === "string") references.add(value.$ref);
  for (const nested of Object.values(value)) collectReferences(nested, references);
  return references;
}

const actual = new Map();
for (const file of fs.readdirSync(routesDirectory).filter((name) => name.endsWith(".routes.js"))) {
  const router = require(path.join(routesDirectory, file));
  collectRouterOperations(router.stack, actual, file);
}

const documented = new Map();
const incomplete = [];
for (const [routePath, pathItem] of Object.entries(swaggerSpec.paths || {})) {
  for (const method of HTTP_METHODS) {
    const operation = pathItem[method];
    if (!operation) continue;
    const key = `${method.toUpperCase()} ${routePath}`;
    documented.set(key, operation);
    if (!operation.summary || !operation.responses || !Object.keys(operation.responses).length) incomplete.push(key);
  }
}

const missing = [...actual.keys()].filter((operation) => !documented.has(operation)).sort();
const stale = [...documented.keys()].filter((operation) => !actual.has(operation)).sort();
const missingReferences = [...collectReferences(swaggerSpec)].filter((reference) => !findLocalReference(swaggerSpec, reference)).sort();

if (missing.length || stale.length || incomplete.length || missingReferences.length) {
  console.error(`Swagger coverage failed: ${actual.size} routes, ${documented.size} documented operations.`);
  if (missing.length) console.error(`\nMissing operations:\n${missing.map((item) => `  ${item} (${actual.get(item)})`).join("\n")}`);
  if (stale.length) console.error(`\nDocumented operations without a route:\n${stale.map((item) => `  ${item}`).join("\n")}`);
  if (incomplete.length) console.error(`\nOperations missing a summary or responses:\n${incomplete.map((item) => `  ${item}`).join("\n")}`);
  if (missingReferences.length) console.error(`\nBroken local schema references:\n${missingReferences.map((item) => `  ${item}`).join("\n")}`);
  process.exit(1);
}

console.log(`Swagger coverage complete: ${documented.size}/${actual.size} API operations documented across ${Object.keys(swaggerSpec.paths).length} paths.`);
