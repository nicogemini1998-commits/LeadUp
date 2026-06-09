import { inngest } from '../inngest.js';
import axios from 'axios';
import { z } from 'zod';

const LeadInputSchema = z.object({
  companyName: z.string().min(1),
  website: z.string().url().optional(),
  domain: z.string().optional(),
});

export type LeadInput = z.infer<typeof LeadInputSchema>;

const LUSHA_API = 'https://api.lusha.com';
const APIFY_API = 'https://api.apify.com/v2';

export const enrichLeadWaterfall = inngest.createFunction(
  {
    id: 'leadup-enrich-waterfall',
    name: 'LeadUp Enrichment Waterfall (Lusha -> Apify)',
    retries: 3,
    concurrency: { limit: 5 },
  },
  { event: 'leadup/lead.enrich.requested' },
  async ({ event, step }) => {
    const input = LeadInputSchema.parse(event.data);

    const lushaResult = await step.run('lusha-primary', async () => {
      if (!process.env.LUSHA_API_KEY) return { skipped: true, reason: 'no-key' };
      try {
        const { data } = await axios.get(`${LUSHA_API}/company`, {
          params: { company: input.companyName, domain: input.domain ?? input.website },
          headers: { api_key: process.env.LUSHA_API_KEY },
          timeout: 15_000,
        });
        return { ok: true, company: data };
      } catch (err: any) {
        return { ok: false, error: err?.response?.status ?? err.message };
      }
    });

    const apifyResult = await step.run('apify-fallback', async () => {
      const lushaHit = lushaResult && 'ok' in lushaResult && lushaResult.ok && lushaResult.company;
      if (lushaHit) return { skipped: true, reason: 'lusha-hit' };
      if (!process.env.APIFY_TOKEN) return { skipped: true, reason: 'no-key' };
      try {
        const { data } = await axios.post(
          `${APIFY_API}/acts/compass~crawler-google-places/run-sync-get-dataset-items`,
          { searchStringsArray: [input.companyName], maxCrawledPlacesPerSearch: 1 },
          { headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}` }, timeout: 60_000 }
        );
        return { ok: true, places: Array.isArray(data) ? data.slice(0, 1) : [] };
      } catch (err: any) {
        return { ok: false, error: err?.response?.status ?? err.message };
      }
    });

    const finalLead = await step.run('merge-and-persist', async () => {
      const merged = {
        companyName: input.companyName,
        sources: {
          lusha: lushaResult,
          apify: apifyResult,
        },
        enrichedAt: new Date().toISOString(),
      };
      // TODO: POST to the LeadUp backend (/api/companies) to persist results
      return merged;
    });

    return finalLead;
  }
);
