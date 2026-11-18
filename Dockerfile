FROM node:24-bookworm
WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
COPY package*.json ./
RUN npm ci
RUN npx playwright install --with-deps chromium && chmod -R a+rX /opt/playwright
COPY --chown=node:node . .
RUN npm run db:generate && chown node:node /app
USER node
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
