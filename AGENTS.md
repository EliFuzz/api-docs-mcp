# Project Overview

- **Purpose**: This project is an MCP (Model Context Protocol) server that provides API and GraphQL documentation and search capabilities. It enables AI agents and tools to access and query API documentation from various sources (files or URLs) in a structured format.
- **Key Features**:
  - Automatic GraphQL schema introspection and documentation extraction from local files (.graphql, .gql, .json) or remote URLs
  - Two primary tools: `api_docs` (list all API methods) and `api_search` (get detailed documentation for specific methods)
  - Caching with TTL to minimize redundant schema fetches
  - Support for queries, mutations, and subscriptions in GraphQL schemas
  - Configurable through environment variables for multiple API sources
- **Technology Stack**:
  - **Languages**: TypeScript (ES2022)
  - **Frameworks**: Model Context Protocol SDK (@modelcontextprotocol/sdk)
  - **Key Libraries**: GraphQL (16.11.0), graphql-tools for schema loading and introspection, Zod for schema validation
  - **Infra**: Node.js (24.0.0+), pnpm package manager
  - **Build Tools**: TypeScript compiler with tsc-alias for path resolution

## Dev Environment Setup

Assume your current shell is `zsh` and your working directory for commands is the project root: `api-docs-mcp`.

- `pnpm install`: Install all dependencies from pnpm-lock.yaml (use `--frozen-lockfile` for CI/CD)
- `pnpm run build`: Compile TypeScript to JavaScript in the `build/` directory with type declarations and source maps
- `pnpm run dev`: Run TypeScript compiler in watch mode for development (outputs to `build/` on file changes)
- `pnpm run start`: Execute the compiled MCP server from `build/index.js` (must build first)
- `node build/index.js`: Alternative way to start the server after building

**Environment Configuration**:

- The server requires `API_SOURCES` environment variable containing a JSON array of schema sources
- Example: `API_SOURCES='[{"name":"GitHub","type":"gql","url":"https://api.github.com/graphql","method":"POST","headers":{"Authorization":"Bearer token"}}]'`
- Sources can be file-based (with `path` property) or URL-based (with `url` and `method` properties)

## Project Layout

- **Configuration Files**:
  - `package.json`: Project metadata, dependencies, scripts, and npm package configuration with bin entry point
  - `tsconfig.json`: TypeScript compiler configuration with ES2022 target, ESNext modules, path aliases (src/\*), and tsc-alias settings
  - `.eslintrc.json`: ESLint rules including TypeScript, Prettier integration, and code style enforcement (2-space indent, single quotes, semicolons required)
  - `pnpm-lock.yaml`: Locked dependency versions for reproducible builds
  - `LICENSE`: Apache-2.0 license file

- **Architectural Elements**:
  - **Entry Point**:
    - `src/index.ts`: Main executable entry point with shebang, initializes server with StdioServerTransport, registers tools, and sets up cache refresh interval
    - `src/server.ts`: MCP server instance creation and tool registration logic (dynamically loads all tool files from `src/tools/`)
  - **Tools** (MCP server capabilities):
    - `src/tools/api_docs.ts`: Tool for listing all available API methods from configured sources with structured output
    - `src/tools/api_search.ts`: Tool for retrieving detailed documentation of specific API methods by name
  - **GraphQL Processing**:
    - `src/gql/gql.ts`: Core GraphQL schema processing logic that extracts queries, mutations, subscriptions, and builds detailed field structures with type information, enum values, and descriptions
  - **Utilities**:
    - `src/utils/cache.ts`: Cache management with CacheEntry interface, TTL-based expiration (12h), and refresh logic for both file and URL sources
    - `src/utils/config.ts`: Environment variable parsing for `API_SOURCES` configuration
    - `src/utils/fetch.ts`: HTTP fetch utilities for remote GraphQL introspection queries
    - `src/utils/file.ts`: File system operations for reading local schema files (.json, .graphql, .gql)
    - `src/utils/source.ts`: Type definitions and type guards for FileSource, UrlSource, and SchemaSource with SourceType enum (currently only GQL)
  - **CI/CD**:
    - `.github/workflows/publish.yml`: GitHub Actions workflow for automated npm publishing on main branch (version bump, build, publish with `[skip ci]` commit tagging)

- **Code Style Guidelines**:
  - Use 2-space indentation consistently
  - Single quotes for strings
  - Semicolons required at statement ends
  - Avoid `any` types (enforced by ESLint)
  - Minimize console usage (console.log triggers warnings)
  - Use path aliases (e.g., `src/*`) instead of relative imports
  - Follow async/await patterns for asynchronous operations
  - Type all function parameters and return values explicitly where possible
