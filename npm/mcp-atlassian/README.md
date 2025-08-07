# @vjain419/mcp-atlassian

Small npm wrapper to run the MCP Atlassian server via `npx`.

This invokes the Python CLI `mcp-atlassian` using `uvx` when available, or falls back to the official Docker image.

## Install / Run

You don’t need to install globally; use `npx`:

```
npx -y @vjain419/mcp-atlassian --version
```

Examples:

```
# Default (stdio)
CONFLUENCE_URL=https://your.atlassian.net/wiki \
JIRA_URL=https://your.atlassian.net \
npx -y @vjain419/mcp-atlassian -v

# OAuth setup wizard (adds token cache volume when using Docker)
npx -y @vjain419/mcp-atlassian --oauth-setup

# HTTP transport (port mapping with Docker if PORT is provided)
TRANSPORT=sse PORT=9000 \
npx -y @vjain419/mcp-atlassian --port 9000
```

The wrapper prefers `uvx` (https://docs.astral.sh/uv), then falls back to Docker (`ghcr.io/sooperset/mcp-atlassian:latest`). If neither is available, it prints setup instructions.

## Environment variables

When running via Docker, the wrapper forwards commonly used variables if they’re set in your environment:

- Core: `ENABLED_TOOLS`, `READ_ONLY_MODE`, `MCP_VERBOSE`, `MCP_LOGGING_STDOUT`
- Confluence: `CONFLUENCE_URL`, `CONFLUENCE_USERNAME`, `CONFLUENCE_API_TOKEN`, `CONFLUENCE_PERSONAL_TOKEN`, `CONFLUENCE_SSL_VERIFY`, `CONFLUENCE_SPACES_FILTER`, `CONFLUENCE_CUSTOM_HEADERS`
- Jira: `JIRA_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN`, `JIRA_PERSONAL_TOKEN`, `JIRA_SSL_VERIFY`, `JIRA_PROJECTS_FILTER`, `JIRA_CUSTOM_HEADERS`
- OAuth: `ATLASSIAN_OAUTH_CLIENT_ID`, `ATLASSIAN_OAUTH_CLIENT_SECRET`, `ATLASSIAN_OAUTH_REDIRECT_URI`, `ATLASSIAN_OAUTH_SCOPE`, `ATLASSIAN_OAUTH_CLOUD_ID`, `ATLASSIAN_OAUTH_ACCESS_TOKEN`
- Transport: `TRANSPORT`, `PORT`, `HOST`, `STREAMABLE_HTTP_PATH`
- Proxies: `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`, `SOCKS_PROXY`, service-specific variants

If `--oauth-setup` is passed and you’re on macOS/Linux, the wrapper mounts `${HOME}/.mcp-atlassian` to persist tokens.

## Pinning the Python version

Set `MCP_ATLASSIAN_PYPI_VERSION` to pin the PyPI version used with `uvx`:

```
MCP_ATLASSIAN_PYPI_VERSION=1.2.3 npx -y @vjain419/mcp-atlassian --version
```

## License

MIT

