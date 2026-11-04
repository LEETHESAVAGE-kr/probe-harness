FROM node:22-alpine
# Dockerfile — 의존성 0이라 npm install이 없다(빌드가 네트워크를 타지 않는다).
# 쓰기 폴더 /app/var를 만들고 node 사용자에게 넘긴 뒤 USER node. 업무 시간대는 APP_TZ(시스템 TZ와 무관).
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DB_PATH=/app/var/app.db APP_TZ=Asia/Seoul
COPY . .
RUN mkdir -p /app/var && chown -R node:node /app/var
USER node
VOLUME ["/app/var"]
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1
CMD ["node", "server.js"]
