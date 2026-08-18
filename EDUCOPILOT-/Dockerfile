FROM node:22-bookworm

WORKDIR /app

# =====================================================
# INSTALL PYTHON
# =====================================================

RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && rm -rf /var/lib/apt/lists/*

# =====================================================
# NODE DEPENDENCIES
# =====================================================

COPY server/package*.json ./server/

RUN cd server && \
    npm install --omit=dev

# =====================================================
# PYTHON AI SERVICE REQUIREMENTS
# =====================================================

COPY ai_service/requirements.txt ./ai_service/

# =====================================================
# PYTHON VIRTUAL ENVIRONMENT
# =====================================================

RUN python3 -m venv /ai_venv

ENV PATH="/ai_venv/bin:$PATH"

# =====================================================
# PYTHON DEPENDENCIES
# =====================================================

RUN pip install --upgrade pip

# CPU ONLY PYTORCH

RUN pip install \
    --no-cache-dir \
    torch \
    --index-url https://download.pytorch.org/whl/cpu

# Other AI dependencies

RUN pip install \
    --no-cache-dir \
    -r ./ai_service/requirements.txt

# =====================================================
# COPY APPLICATION
# =====================================================

COPY server ./server

COPY ai_service ./ai_service

COPY client/dist ./client/dist

# =====================================================
# ENVIRONMENT
# =====================================================

ENV NODE_ENV=production

ENV PORT=5000

ENV HOST=0.0.0.0

ENV AI_SERVICE_URL=http://127.0.0.1:8000

ENV AI_SERVICE_HOST=127.0.0.1

ENV AI_SERVICE_PORT=8000

# =====================================================
# ONLY PUBLIC PORT
# =====================================================

EXPOSE 5000

# =====================================================
# START NODE
# NODE WILL START PYTHON INTERNALLY
# =====================================================

WORKDIR /app/server

CMD ["node", "server.js"]
