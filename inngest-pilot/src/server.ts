import Fastify from 'fastify';
import inngestFastify from 'inngest/fastify';
import { inngest } from './inngest.js';
import { enrichLeadWaterfall } from './functions/enrichWaterfall.js';

const app = Fastify({ logger: true });

app.register(inngestFastify as any, {
  client: inngest,
  functions: [enrichLeadWaterfall],
});

app.get('/health', async () => ({ ok: true, service: 'leadup-inngest-pilot' }));

const port = Number(process.env.PORT ?? 3100);
const host = process.env.HOST ?? '0.0.0.0';

app.listen({ port, host }).then(() => {
  app.log.info(`leadup-inngest-pilot listening on http://${host}:${port}`);
});
