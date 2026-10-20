import type { Server } from "node:http";

export function resolveRequest(root: string, url: string): string | null;
export function createServer(root: string): Server;
export function listen(server: Server, host: string, port: number, attempts?: number): Promise<number>;
