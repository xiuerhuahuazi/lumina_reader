import { RSSHubNamespace } from '../types';

export async function fetchRSSHubRoutes(): Promise<RSSHubNamespace[]> {
  try {
    const resp = await fetch('/api/rsshub/routes');
    if (!resp.ok) return [];
    return await resp.json();
  } catch {
    return [];
  }
}
