export const config = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '',
  mockDataEnabled: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
  chainId: import.meta.env.VITE_CHAIN_ID ? Number(import.meta.env.VITE_CHAIN_ID) : undefined,
  chainName: import.meta.env.VITE_CHAIN_NAME ?? 'MST Testnet',
  rpcUrl: import.meta.env.VITE_RPC_URL ?? '',
  explorerUrl: (import.meta.env.VITE_EXPLORER_URL as string | undefined)?.replace(/\/$/, '') ?? '',
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS ?? '',
}
export const integrationReady = Boolean(config.chainId && config.rpcUrl && config.explorerUrl && config.contractAddress)
