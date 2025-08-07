#!/usr/bin/env node
"use strict";

const { spawn, spawnSync } = require("child_process");
const os = require("os");
const path = require("path");

function hasExecutable(cmd) {
  try {
    const res = spawnSync(cmd, ["--version"], { stdio: "ignore" });
    return res.status === 0 || res.status === 1 || res.status === 2;
  } catch (_) {
    return false;
  }
}

function findArgValue(args, name) {
  // supports --name value and --name=value
  const long = name;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === long && i + 1 < args.length) return args[i + 1];
    if (a.startsWith(long + "=")) return a.substring(long.length + 1);
  }
  return undefined;
}

function hasFlag(args, name) {
  return args.some((a) => a === name || a.startsWith(name + "="));
}

function run(cmd, cmdArgs) {
  const child = spawn(cmd, cmdArgs, { stdio: "inherit", shell: false });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
  child.on("error", (err) => {
    console.error("Failed to start:", err.message);
    process.exit(1);
  });
}

const argv = process.argv.slice(2);

// 1) Prefer uvx/uv if available
{
  const pkgVersion = process.env.MCP_ATLASSIAN_PYPI_VERSION;
  const spec = pkgVersion ? `mcp-atlassian==${pkgVersion}` : "mcp-atlassian";

  if (hasExecutable("uvx")) {
    // Use explicit form to run command from the package
    // Avoids shells trying to resolve the binary name
    run("uvx", ["--from", spec, "mcp-atlassian", ...argv]);
    return;
  }

  if (hasExecutable("uv")) {
    // Fallback to `uv x` if `uvx` shim is not present
    run("uv", ["x", "--from", spec, "mcp-atlassian", ...argv]);
    return;
  }
}

// 2) Fallback to Docker if available
if (hasExecutable("docker")) {
  const dockerArgs = ["run", "--rm", "-i"];

  // Env passthrough whitelist: add -e KEY if present in parent env
  const ENV_KEYS = [
    // Core toggles and logging
    "ENABLED_TOOLS",
    "READ_ONLY_MODE",
    "MCP_VERBOSE",
    "MCP_LOGGING_STDOUT",
    // Confluence
    "CONFLUENCE_URL",
    "CONFLUENCE_USERNAME",
    "CONFLUENCE_API_TOKEN",
    "CONFLUENCE_PERSONAL_TOKEN",
    "CONFLUENCE_SSL_VERIFY",
    "CONFLUENCE_SPACES_FILTER",
    "CONFLUENCE_CUSTOM_HEADERS",
    // Jira
    "JIRA_URL",
    "JIRA_USERNAME",
    "JIRA_API_TOKEN",
    "JIRA_PERSONAL_TOKEN",
    "JIRA_SSL_VERIFY",
    "JIRA_PROJECTS_FILTER",
    "JIRA_CUSTOM_HEADERS",
    // OAuth
    "ATLASSIAN_OAUTH_CLIENT_ID",
    "ATLASSIAN_OAUTH_CLIENT_SECRET",
    "ATLASSIAN_OAUTH_REDIRECT_URI",
    "ATLASSIAN_OAUTH_SCOPE",
    "ATLASSIAN_OAUTH_CLOUD_ID",
    "ATLASSIAN_OAUTH_ACCESS_TOKEN",
    // Transport config
    "TRANSPORT",
    "PORT",
    "HOST",
    "STREAMABLE_HTTP_PATH",
    // Proxies
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "NO_PROXY",
    "SOCKS_PROXY",
    "JIRA_HTTP_PROXY",
    "JIRA_HTTPS_PROXY",
    "JIRA_NO_PROXY",
    "CONFLUENCE_HTTP_PROXY",
    "CONFLUENCE_HTTPS_PROXY",
    "CONFLUENCE_NO_PROXY",
  ];
  for (const key of ENV_KEYS) {
    if (process.env[key] !== undefined) {
      dockerArgs.push("-e", key);
    }
  }

  // If PORT is set or --port provided, map the port
  let port = process.env.PORT;
  const argPort = findArgValue(argv, "--port");
  if (!port && argPort) port = argPort;
  if (port && /^\d+$/.test(port)) {
    dockerArgs.push("-p", `${port}:${port}`);
  }

  // If oauth-setup is requested, add token cache mount (non-Windows only)
  const isOauthSetup = hasFlag(argv, "--oauth-setup");
  if (isOauthSetup && os.platform() !== "win32") {
    const home = os.homedir();
    const hostDir = path.join(home, ".mcp-atlassian");
    dockerArgs.push("-v", `${hostDir}:/home/app/.mcp-atlassian`);
  }

  // Image
  dockerArgs.push("ghcr.io/sooperset/mcp-atlassian:latest");

  // Pass-through original args
  dockerArgs.push(...argv);

  run("docker", dockerArgs);
  return;
}

// 3) Helpful error if no runner available
console.error(
  "mcp-atlassian requires either 'uvx' (recommended) or 'docker' to run.\n" +
    "Install uv: https://docs.astral.sh/uv/getting-started/\n" +
    "  macOS/Linux: curl -LsSf https://astral.sh/uv/install.sh | sh\n" +
    "  Windows (PowerShell): irm https://astral.sh/uv/install.ps1 | iex\n" +
    "Or install Docker: https://docs.docker.com/get-docker/"
);
process.exit(1);
