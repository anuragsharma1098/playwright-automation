# Only used by docker-compose.yml in this folder for a manual `docker compose up` dev shell /
# headless test runs outside VS Code - devcontainer.json itself references the base image
# directly (faster start, no build step) for VS Code Dev Containers / GitHub Codespaces.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

# Interactive-dev extras the base Playwright image doesn't bother with. It already runs as
# non-root "pwuser" - let it sudo for ad-hoc installs. openjdk-17-jre-headless (JRE only, no
# JDK/compiler) is enough to run the `allure` CLI (allure-commandline devDependency) - nothing
# here compiles Java.
#
# Also pre-creates /workspace/node_modules owned by pwuser: docker-compose.yml mounts
# node_modules as a separate named volume (see its own comment for why), and Docker copies a
# mount point's existing ownership into a *new* named volume on first creation - without this,
# the volume comes up root-owned and `npm ci` as pwuser fails with EACCES.
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    sudo \
    openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/* \
    && echo "pwuser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/pwuser \
    && chmod 0440 /etc/sudoers.d/pwuser \
    && npm install -g npm@latest typescript \
    && mkdir -p /workspace/node_modules \
    && chown -R pwuser:pwuser /workspace

USER pwuser
WORKDIR /workspace

# Docker Desktop's bind mount (Windows/macOS) presents the workspace as owned by a different
# UID than pwuser, which trips git's post-CVE-2022-24765 "dubious ownership" check and breaks
# Husky's `prepare` script (`npm ci` otherwise fails on this). /workspace is the container's own
# bind-mounted copy of this repo, not a shared machine path, so trusting it here is safe.
RUN git config --global --add safe.directory /workspace

CMD ["/bin/bash"]
