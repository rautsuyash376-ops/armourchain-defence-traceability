export type UserRole = 'Supplier' | 'Depot officer' | 'Logistics officer' | 'Maintenance engineer' | 'Auditor' | 'Administrator'
export type AssetStatus = 'Operational' | 'In transit' | 'Maintenance' | 'Awaiting approval' | 'Retired'
export type EventType = 'Registration' | 'Delivery' | 'Inspection' | 'Custody transfer' | 'Maintenance' | 'Audit review' | 'Certificate added'
export type TxState = 'Wallet approval' | 'Submitted' | 'Confirmed' | 'Failed'
export interface DocumentProof { id: string; type: string; hash: string; issuedBy: string; issuedAt: string; verified: boolean; metadata: string }
export interface TraceEvent { id: string; type: EventType; title: string; description: string; actorRole: UserRole; actorLabel: string; timestamp: string; txHash?: string; state: TxState; from?: string; to?: string }
export interface Asset { id: string; name: string; category: string; serial: string; supplier: string; registeredAt: string; status: AssetStatus; custodian: string; custodianRole: UserRole; certificateCount: number; health: number; events: TraceEvent[]; documents: DocumentProof[] }
export interface Approval { id: string; assetId: string; assetName: string; action: string; requestedBy: string; role: UserRole; requestedAt: string; priority: 'Normal' | 'Elevated'; status: 'Pending' | 'Approved' | 'Rejected' }
export interface TransactionRecord { hash: string; assetId: string; action: string; submittedAt: string; state: TxState; demoOnly?: boolean; confirmations: number; blockNumber?: number; from: string; to?: string; explorerUrl?: string; error?: string }
export interface DashboardSummary { totalAssets: number; operational: number; inTransit: number; maintenance: number; pendingApprovals: number }
export interface AssetListResponse { items: Asset[]; total: number; page: number; pageSize: number }
export interface ApiError { code: string; message: string; requestId?: string }
