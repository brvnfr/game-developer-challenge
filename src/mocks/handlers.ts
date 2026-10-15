import { delay, http, HttpResponse, type HttpResponseResolver } from 'msw';
import { z } from 'zod';
import {
  API_PATHS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  registerMatchRequestSchema,
  type ApiErrorBody,
  type Page,
  type PageRequest,
} from '@/api/contracts';
import { parseConfigKey } from '@/game/config/matchConfig';
import type { MockServer } from './MockServer';
import type { MockEndpoint, MockFault, ResponsePlan } from './scenarios';

const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json<ApiErrorBody>({ code, message }, { status });
}

/** The "empty lists" scenario answers with the same page, emptied. */
function listResponse<Item>(plan: ResponsePlan, page: Page<Item>) {
  return HttpResponse.json(plan.listMode === 'empty' ? { ...page, items: [], totalItems: 0, totalPages: 0 } : page);
}

function readPage(url: URL): PageRequest | null {
  const parsed = pageQuerySchema.safeParse({
    page: url.searchParams.get('page') ?? undefined,
    pageSize: url.searchParams.get('pageSize') ?? undefined,
  });
  return parsed.success ? parsed.data : null;
}

/**
 * REST handlers of the ranking and history API, shared by the browser worker (development, tests, published
 * build) and the Node server (Vitest). Every request first asks the selected scenario how to behave.
 */
export function createHandlers(server: MockServer, apiPath: string) {
  const path = (endpointPath: string) => `*${apiPath}${endpointPath}`;

  async function applyFault(fault: MockFault) {
    switch (fault.kind) {
      case 'networkError':
        return HttpResponse.error();
      case 'noAnswer':
        await delay(server.noAnswerDelayMs);
        return errorResponse(504, 'gateway_timeout', 'No answer.');
      case 'status':
        return errorResponse(fault.status, fault.code, fault.message);
    }
  }

  /** Waits, applies a fault planned before the work, runs the work, then a fault planned after it. */
  function withScenario(
    endpoint: MockEndpoint,
    work: (
      plan: ResponsePlan,
      request: Request,
      params: Record<string, string | readonly string[] | undefined>,
    ) => Promise<Response>,
    matchIdOf?: (params: Record<string, string | readonly string[] | undefined>) => string | undefined,
  ): HttpResponseResolver {
    return async ({ request, params }) => {
      const plan = server.scenarios.plan(endpoint, matchIdOf?.(params));
      await delay(plan.delayMs);
      if (plan.fault && !plan.appliesFaultAfterCommit) return applyFault(plan.fault);
      const response = await work(plan, request, params);
      if (plan.fault && response.ok) return applyFault(plan.fault);
      return response;
    };
  }

  return [
    http.get(
      path(API_PATHS.rankingConfigurations),
      withScenario('configurations', () => Promise.resolve(HttpResponse.json(server.database.configurations()))),
    ),

    http.get(
      path(API_PATHS.ranking),
      withScenario('ranking', (plan, request) => {
        const url = new URL(request.url);
        const pageRequest = readPage(url);
        const configKey = url.searchParams.get('configKey') ?? '';
        const settings = parseConfigKey(configKey);
        if (!pageRequest || !settings) {
          return Promise.resolve(errorResponse(400, 'bad_request', 'configKey, page and pageSize are required.'));
        }
        const extra = plan.listMode === 'many' ? server.demoRanking(settings) : [];
        return Promise.resolve(listResponse(plan, server.database.ranking(configKey, pageRequest, extra)));
      }),
    ),

    http.get(
      path('/players/:playerId/matches'),
      withScenario('history', (plan, request, params) => {
        const playerId = typeof params['playerId'] === 'string' ? params['playerId'] : '';
        const pageRequest = readPage(new URL(request.url));
        if (!pageRequest || playerId === '') {
          return Promise.resolve(errorResponse(400, 'bad_request', 'page and pageSize must be positive integers.'));
        }
        const known = server.database.history(playerId, { page: 1, pageSize: 1 }).items[0];
        const extra = plan.listMode === 'many' ? server.demoHistory(playerId, known?.playerName ?? 'You') : [];
        return Promise.resolve(listResponse(plan, server.database.history(playerId, pageRequest, extra)));
      }),
    ),

    http.put(
      path('/matches/:matchId'),
      withScenario(
        'register',
        async (_plan, request, params) => {
          const body: unknown = await request.json().catch(() => null);
          const parsed = registerMatchRequestSchema.safeParse(body);
          if (!parsed.success || parsed.data.matchId !== params['matchId']) {
            return errorResponse(400, 'bad_request', 'The match record is invalid.');
          }
          const outcome = server.database.register(parsed.data);
          if (outcome.kind === 'conflict') {
            return errorResponse(409, 'conflict', 'Another match is already stored with this id.');
          }
          return HttpResponse.json(outcome.record, { status: outcome.kind === 'created' ? 201 : 200 });
        },
        (params) => (typeof params['matchId'] === 'string' ? params['matchId'] : undefined),
      ),
    ),
  ];
}
