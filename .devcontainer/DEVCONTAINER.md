# Development Container Setup Guide

This project includes a **Development Container (devcontainer)** configuration for a consistent,
isolated development environment using Docker and VS Code.

## What is a Dev Container?

A dev container is a containerized development environment that:

- Provides a consistent setup across all developers
- Eliminates "works on my machine" problems
- Includes all required tools (Node, Playwright + all three browser engines, TypeScript) pre-installed
- Integrates seamlessly with VS Code
- Isolates your machine from project dependencies

## Prerequisites

### 1. Install Docker

**Windows / macOS:**

- Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)

**Linux:**

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### 2. Install the VS Code Dev Containers extension

- Open VS Code → Extensions (Ctrl+Shift+X) → search "Dev Containers" → install the official
  Microsoft extension

Or from the CLI:

```bash
code --install-extension ms-vscode-remote.remote-containers
```

### 3. Ensure Docker is running

**Windows/macOS:** open Docker Desktop and keep it running.
**Linux:** `sudo systemctl start docker`

## Quick start

### Option 1: VS Code Dev Containers (recommended)

1. Open the project in VS Code: `code .`
2. Press `F1` (Cmd+Shift+P on macOS) → `Dev Containers: Reopen in Container` → Enter
3. Wait for setup (a minute or two on first run - `postCreateCommand` runs `npm ci` and a
   sanity check of the Playwright MCP package)
4. You're ready - the integrated terminal now runs inside the container, and your local files
   are bind-mounted and synced

### Option 2: Attach to an already-running container

```bash
# From VS Code command palette
F1 > Dev Containers: Attach to Running Container > vacation-rental-automation-dev
```

```bash
# Or from a terminal
docker compose -f .devcontainer/docker-compose.yml exec devcontainer bash
```

### Option 3: Manual Docker Compose (no VS Code)

```bash
docker compose -f .devcontainer/docker-compose.yml up -d --build   # build and start
docker compose -f .devcontainer/docker-compose.yml exec devcontainer bash  # enter the shell
docker compose -f .devcontainer/docker-compose.yml down             # stop
```

## Verified & working

The full `docker compose -f .devcontainer/docker-compose.yml up --build` → `exec` → test → Allure
flow has been exercised end to end (not just built):

```
✅ mcr.microsoft.com/playwright:v1.62.1-noble — image builds and runs as pwuser
✅ Playwright 1.62.1 — chromium, firefox, webkit all preinstalled in the base image
✅ npm ci — 179 packages, 0 vulnerabilities, Husky hook installed via `prepare`
✅ A real spec (tc1-social-links.spec.ts) passed against the live site from inside the container
✅ openjdk-17-jre-headless — java -version works; allure --version reports 2.43.0
✅ npm run allure:generate — real allure-results/ turned into a browsable allure-report/,
   both landing on the host through the bind mount (no extra volume flags needed)
✅ TypeScript / ESLint / Prettier — all runnable inside the container exactly as on the host
```

Two non-obvious fixes are already baked into the Dockerfile because of what running this for real
surfaced, not left as manual troubleshooting steps:

- **`node_modules` named volume comes up root-owned.** Docker only copies a mount point's
  existing ownership into a _brand-new_ named volume if that path already exists (with the right
  owner) in the image - so the Dockerfile pre-creates `/workspace/node_modules` and `chown`s it to
  `pwuser` before `docker-compose.yml`'s volume ever attaches. Without this, `npm ci` fails with
  `EACCES`.
- **Git's "dubious ownership" check breaks Husky.** Docker Desktop's bind mount (Windows/macOS)
  presents the workspace as owned by a different UID than `pwuser`, which trips git's
  post-CVE-2022-24765 safety check and makes `npm ci`'s `prepare` (Husky) step fail. The Dockerfile
  runs `git config --global --add safe.directory /workspace` for the compose path;
  `devcontainer.json`'s `postCreateCommand` does the equivalent for the VS Code path.

Note: `playwright.config.ts` runs each site against Chromium, Firefox, and WebKit (all three are
bundled in this base image); Microsoft Edge is a fourth project per site but uses the real `msedge`
channel, which this image doesn't include - `npm run test:edge` needs `npx playwright install
msedge` run inside the container first.

## What's included in the dev container

| Component          | Version                   | Purpose                                                                                                   |
| ------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Playwright**     | 1.62.1                    | Official image, matches `@playwright/test` exactly                                                        |
| Chromium           | bundled with 1.62.1       | Used by every `*-chromium` project                                                                        |
| Firefox            | bundled with 1.62.1       | Used by every `*-firefox` project                                                                         |
| WebKit             | bundled with 1.62.1       | Used by every `*-webkit` project                                                                          |
| Node.js            | as shipped in the image   | JavaScript/TypeScript runtime                                                                             |
| TypeScript         | latest (installed global) | Type-safe development                                                                                     |
| Git                | via devcontainer feature  | Version control inside the container                                                                      |
| Java (JRE/JDK 17)  | via feature / apt         | Runs `allure` (a Java program) - JDK via feature (VS Code path), headless JRE only via apt (compose path) |
| allure-commandline | 2.43.0                    | Generates the Allure HTML report from `allure-results/`                                                   |
| allure-playwright  | ^3.10.2                   | Playwright reporter that writes `allure-results/`                                                         |
| ESLint             | ^9.13                     | Code linting (same config as the host)                                                                    |
| Prettier           | ^3.3                      | Code formatting (same config as the host)                                                                 |

## VS Code extensions included

Automatically installed inside the container (see `devcontainer.json`):

- **ms-playwright.playwright** — Playwright Test Explorer & Inspector
- **dbaeumer.vscode-eslint** — ESLint integration
- **esbenp.prettier-vscode** — Prettier code formatter (set as the default formatter, format-on-save enabled)
- **ms-vscode.vscode-typescript-next** — TypeScript language support
- **GitHub.vscode-github-actions** — GitHub Actions workflow support
- **ms-azuretools.vscode-docker** — Docker/Compose support (for editing the Dockerfiles themselves)

## Running tests inside the container

Every script from the root `package.json` works exactly the same as on the host:

```bash
npm test                 # both sites, all specs
npm run test:alice       # Alice Lodging only
npm run test:firesky     # Firesky Retreats only
npx playwright test -g "TC2"
npm run test:headed
npm run test:ui          # opens a native UI window - won't work in a headless container, see below
npm run test:ui:docker   # Alice Chromium UI mode for container debugging - serves over :9224
npm run test:debug
npm run typecheck
npm run lint
npm run format
npm run report             # opens the Playwright HTML report
npm run allure:generate    # build the Allure report from allure-results/
npm run allure:open        # serve it on :9000 (forwarded - see devcontainer.json)
npm run allure:serve       # generate + serve in one ephemeral step
```

### Debugging with UI mode inside the container

`playwright test --ui` normally opens a native app window, which doesn't exist in a headless
container. `npm run test:ui:docker` instead runs `playwright test --ui --project=alice-chromium --ui-host=0.0.0.0
--ui-port=9224`, which serves the same UI mode (watch mode, time-travel trace viewer, pick-and-run
tests) as a web page instead of a native window:

1. Run `npm run test:ui:docker` inside the container.
2. Open `http://localhost:9224` in a browser **on the host** - VS Code Dev Containers auto-forwards
   port 9224 and opens it for you (see `devcontainer.json`'s `portsAttributes`); with the manual
   `docker compose` path, `docker-compose.yml` publishes `9224:9224` so the same URL works directly.
3. Leave the command running - it stays open (watch mode) until you stop it with Ctrl+C.

## Container management

```bash
docker ps                                                             # check it's running
docker compose -f .devcontainer/docker-compose.yml exec devcontainer bash  # attach
docker compose -f .devcontainer/docker-compose.yml down                    # stop
docker compose -f .devcontainer/docker-compose.yml up -d --build           # rebuild from scratch
```

## File structure

```
.devcontainer/
├── devcontainer.json      # what VS Code Dev Containers / Codespaces actually reads
├── Dockerfile             # used by docker-compose.yml for a manual `docker compose up` dev shell
├── docker-compose.yml     # manual dev-shell workflow outside of VS Code
└── DEVCONTAINER.md        # this file
```

## Configuration details

### devcontainer.json

- **Base image:** `mcr.microsoft.com/playwright:v1.62.1-noble` referenced directly (no build
  step, fast start) - the exact same tag the `Dockerfile` in this folder uses, so the VS Code
  path and the manual `docker compose` path mean the same Node/browser/OS-dependency versions.
- **Features:** Git (`ghcr.io/devcontainers/features/git:1`) and Java 17
  (`ghcr.io/devcontainers/features/java:1`) - the standard devcontainer feature only offers a
  full JDK, not a JRE-only option, so this path gets slightly more than strictly needed; the
  `docker-compose.yml` path below installs the smaller headless-JRE-only package instead.
- **Post-create:** `npm ci && npx -y @playwright/mcp@latest --version` (installs deps, sanity-checks
  the Playwright MCP dev-aid package from `.mcp.json`)
- **Remote user:** `pwuser` (the Playwright image's built-in non-root user)
- **Forwarded ports:** `9000` for `npm run allure:open`/`allure:serve`, `9224` for
  `npm run test:ui:docker` (Playwright UI mode)

### Dockerfile (this folder)

- Builds on the same official Playwright image as `devcontainer.json`
- Adds `git`, `curl`, `sudo` (passwordless for `pwuser`), and `openjdk-17-jre-headless` - just
  enough beyond the base Playwright image to run interactively and run the `allure` CLI (no
  JDK/compiler needed, `allure-commandline` only runs Java, it doesn't compile any)
- Installs `npm@latest` and `typescript` globally
- Only used by `docker-compose.yml` in this folder, not by `devcontainer.json` itself

### docker-compose.yml (this folder)

- Builds the Dockerfile above
- Bind-mounts the workspace (`..:/workspace:cached`) plus a named volume for `node_modules`
  (host and container installs shouldn't share that directory directly - native module builds
  differ between Windows/macOS and Linux)
- `ipc: host` so Chromium doesn't crash from Docker's small default `/dev/shm`
- Keeps the container running (`stdin_open`/`tty`) for interactive `docker compose exec`

## Troubleshooting

### Container fails to build

```bash
docker compose -f .devcontainer/docker-compose.yml down
docker compose -f .devcontainer/docker-compose.yml up --build
```

### `node_modules` looks broken after running commands in _both_ the container and the host

This bit us during development: running `npm ci`/`npm install` inside the container against a
bind-mounted `node_modules` writes Linux binaries into it; the Windows/macOS host then can't
resolve `npx` correctly (`'prettier' is not recognized...`) until it's reinstalled. Fix on
whichever side you're using next:

```bash
rm -rf node_modules && npm install
```

The `docker-compose.yml` here already avoids this by giving `node_modules` its own named volume
instead of sharing the bind-mounted one - prefer that path over `docker run -v .. bash` for
anything that runs `npm install`/`npm ci`.

### Permission denied errors

Ensure the workspace bind mount in `docker-compose.yml` uses `:cached` and that you're running as
`pwuser` (the container's default user) rather than root.

### Out of disk space

```bash
docker system prune -a
```

## Sharing with the team

The devcontainer configuration is committed to the repository. Anyone just needs to:

1. Clone the repo
2. Install Docker Desktop
3. Install the Dev Containers extension in VS Code
4. Open the project and `F1` → `Dev Containers: Reopen in Container`

Same Node version, same browser binaries, same lint/format config, every time.
