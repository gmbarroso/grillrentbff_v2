import { EdgeRateLimitMiddleware } from './edge-rate-limit.middleware';

describe('EdgeRateLimitMiddleware', () => {
  const securityObservability = {
    recordRateLimitEvent: jest.fn(),
  };

  const createRes = () => {
    const res: any = {
      headers: {} as Record<string, string>,
      statusCode: 200,
      body: null as any,
      setHeader: jest.fn((key: string, value: string) => {
        res.headers[key] = value;
      }),
      status: jest.fn((code: number) => {
        res.statusCode = code;
        return res;
      }),
      json: jest.fn((payload: any) => {
        res.body = payload;
        return res;
      }),
    };
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EDGE_RATE_LIMIT_WINDOW_MS = '1000';
    process.env.EDGE_RATE_LIMIT_MAX = '2';
    process.env.LOGIN_RATE_LIMIT_WINDOW_MS = '1000';
    process.env.LOGIN_RATE_LIMIT_MAX = '1';
  });

  afterEach(() => {
    delete process.env.EDGE_RATE_LIMIT_WINDOW_MS;
    delete process.env.EDGE_RATE_LIMIT_MAX;
    delete process.env.LOGIN_RATE_LIMIT_WINDOW_MS;
    delete process.env.LOGIN_RATE_LIMIT_MAX;
  });

  it('applies global rate limit', () => {
    const middleware = new EdgeRateLimitMiddleware(securityObservability as any);
    const next = jest.fn();
    const req: any = { method: 'GET', originalUrl: '/users/profile', ip: '127.0.0.1', socket: {} };

    middleware.use(req, createRes(), next);
    middleware.use(req, createRes(), next);
    const blockedRes = createRes();
    middleware.use(req, blockedRes, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(blockedRes.status).toHaveBeenCalledWith(429);
    expect(securityObservability.recordRateLimitEvent).toHaveBeenCalledWith('global', '127.0.0.1');
  });

  it('applies stricter login rate limit', () => {
    const middleware = new EdgeRateLimitMiddleware(securityObservability as any);
    const next = jest.fn();
    const req: any = { method: 'POST', originalUrl: '/users/login', ip: '127.0.0.1', socket: {} };

    middleware.use(req, createRes(), next);
    const blockedRes = createRes();
    middleware.use(req, blockedRes, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(blockedRes.status).toHaveBeenCalledWith(429);
    expect(securityObservability.recordRateLimitEvent).toHaveBeenCalledWith('login', '127.0.0.1');
  });

  it('falls back to defaults when rate limit env values are invalid', () => {
    process.env.EDGE_RATE_LIMIT_WINDOW_MS = 'abc';
    process.env.EDGE_RATE_LIMIT_MAX = 'invalid';
    process.env.LOGIN_RATE_LIMIT_WINDOW_MS = 'NaN';
    process.env.LOGIN_RATE_LIMIT_MAX = '-1';

    const middleware = new EdgeRateLimitMiddleware(securityObservability as any);

    expect((middleware as any).globalWindowMs).toBe(60_000);
    expect((middleware as any).globalMax).toBe(120);
    expect((middleware as any).loginWindowMs).toBe(900_000);
    expect((middleware as any).loginMax).toBe(8);
  });
});
