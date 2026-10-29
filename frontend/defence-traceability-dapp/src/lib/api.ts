import { config } from './config';
import type {
  ApiError,
  Approval,
  Asset,
  AssetListResponse,
  DashboardSummary,
  TransactionRecord,
} from '../types';

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!config.apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.');
  }

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let body: ApiError | undefined;

    try {
      body = (await response.json()) as ApiError;
    } catch {
      // The response may not contain JSON.
    }

    throw new Error(body?.message ?? `API request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export const api = {
  dashboard: () => request<DashboardSummary>('/dashboard/summary'),

  assets: (query = '') =>
    request<AssetListResponse>(
      `/assets${query ? `?q=${encodeURIComponent(query)}` : ''}`,
    ),

  asset: (id: string) =>
    request<Asset>(`/assets/${encodeURIComponent(id)}`),

  approvals: () => request<Approval[]>('/approvals?status=pending'),

  transactions: () => request<TransactionRecord[]>('/transactions'),

  createAssetDraft: (body: {
    assetCode: string;
    equipmentType: string;
    manufacturer: string;
    supplierWallet: string;
    chainAssetId: string;
    registrationTxHash: string;
    chainId: number;
    contractAddress: string;
  }) =>
    request<unknown>('/assets', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateApproval: (id: string, status: 'Approved' | 'Rejected') =>
    request<Approval>(`/approvals/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};