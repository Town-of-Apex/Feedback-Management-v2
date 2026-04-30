FROM python:3.13-slim

WORKDIR /app

# Install system dependencies (cloudflared arch must match the image, e.g. arm64 on ARM VMs)
ARG TARGETARCH=amd64
RUN apt-get update && apt-get install -y --no-install-recommends openssh-client curl ca-certificates && \
    curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${TARGETARCH}" -o /usr/local/bin/cloudflared && \
    chmod +x /usr/local/bin/cloudflared && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Strip Windows CRLF so the shebang is #!/bin/bash (not /bin/bash\r). Without this,
# Linux often fails with "exec ... no such file or directory" when building on Windows.
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

ENV BASE_PATH=/feedback
EXPOSE 8080

# Absolute path + explicit bash avoids brittle ./ resolution and shebang issues
ENTRYPOINT ["/bin/bash", "/app/entrypoint.sh"]
