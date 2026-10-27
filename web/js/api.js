export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    location.href = "/login.html";
    throw new ApiError("not logged in", 401);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let message = "something went wrong, try again";
    if (typeof data.detail === "string") message = data.detail;
    else if (res.status === 422) message = "please check what you typed";
    throw new ApiError(message, res.status);
  }
  return data;
}
