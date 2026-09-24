export const TIMEOUT_MS = 5000;
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 1000;

export default class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  getOptions(verb, body = null, token = '') {
    return {
      method: verb,
      headers: {
        'Content-Type': 'application/json',
        'authorization': token || 'NoToken',
      },
      body: body ? JSON.stringify(body) : null,
    };
  }

  async #request(verb, path, body, token) {
    const url = `${this.baseUrl}/${path}`;
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      const controller = new AbortController();
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new DOMException('Request timeout', 'AbortError'));
        }, TIMEOUT_MS);
      });

      try {
        const res = await Promise.race([
          fetch(url, {
            ...this.getOptions(verb, body, token),
            signal: controller.signal,
          }),
          timeoutPromise,
        ]);
        return res;
      } catch (err) {
        clearTimeout(timeoutId);
        const isNetworkOrTimeout =
          err.name === 'AbortError' ||
          err instanceof TypeError;
        if (!isNetworkOrTimeout || attempt >= MAX_RETRIES) throw err;
        console.warn(
          `[apiClient] intento ${attempt + 1}/${MAX_RETRIES + 1} falló (${err.name}: ${err.message}), reintentando en ${RETRY_DELAY_MS}ms…`
        );
        attempt += 1;
        if (attempt <= MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }
    throw new Error('apiClient: se agotaron los reintentos');
  }

  get(path, token = '') {
    return this.#request('GET', path, null, token);
  }

  post(path, body, token = '') {
    return this.#request('POST', path, body, token);
  }

  put(path, body, token = '') {
    return this.#request('PUT', path, body, token);
  }

  patch(path, body, token = '') {
    return this.#request('PATCH', path, body, token);
  }

  delete(path, token = '') {
    return this.#request('DELETE', path, null, token);
  }
}
