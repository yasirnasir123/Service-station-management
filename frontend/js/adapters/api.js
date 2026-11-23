export class ApiAdapter {
  constructor() {
    this.csrf = "";
  }
  async request(path, options = {}) {
    const response = await fetch("/api" + path, {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": this.csrf,
        ...options.headers,
      },
    });
    const body = await response.json();
    if (!response.ok) throw Error(body.error || "Request failed");
    return body;
  }
  async login(username, password) {
    await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return this.me();
  }
  async me() {
    const result = await this.request("/auth/me");
    this.csrf = result.csrf;
    return result.user;
  }
  async logout() {
    await this.request("/auth/logout", { method: "POST" });
    this.csrf = "";
  }
  async list(kind, options = {}) {
    return this.request("/" + kind + "?" + new URLSearchParams(options));
  }
  async all(kind) {
    let rows = [],
      page = 1;
    for (;;) {
      const result = await this.list(kind, { page, limit: 100 });
      rows.push(...result.data);
      if (rows.length >= result.total) break;
      page++;
    }
    return rows;
  }
  async get(kind, id) {
    return this.request("/" + kind + "/" + id);
  }
  async save(kind, data, id) {
    return this.request("/" + kind + (id ? "/" + id : ""), {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
  }
  async archive(kind, id) {
    return this.request("/" + kind + "/" + id, { method: "DELETE" });
  }
}
