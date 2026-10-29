import {
  Body,
  ConflictException,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';

type CreateAssetRequest = {
  assetCode?: unknown;
  equipmentType?: unknown;
  manufacturer?: unknown;
  supplierWallet?: unknown;
  chainAssetId?: unknown;
  registrationTxHash?: unknown;
  chainId?: unknown;
  contractAddress?: unknown;
};

@Controller()
export class AppController {
  constructor(private readonly supabase: SupabaseService) {}
    private ensureWritesAllowed() {
    if (process.env.DEMO_READ_ONLY === 'true') {
      throw new ServiceUnavailableException(
        'This public demo is read-only.',
      );
    }
  }

  @Get('api/health/db')
  async checkDatabase() {
    const { error } = await this.supabase.client
      .from('assets')
      .select('id', { count: 'exact', head: true });

    if (error) {
      throw new ServiceUnavailableException(
        'The backend could not read the assets table.',
      );
    }

    return {
      status: 'ok',
      database: 'connected',
    };
  }

  @Get('api/dashboard/summary')
  async dashboardSummary() {
    const [assetsResult, approvalsResult] = await Promise.all([
      this.supabase.client
        .from('assets')
        .select('status')
        .neq('status', 'DRAFT'),

      this.supabase.client
        .from('approvals')
        .select('id')
        .eq('status', 'Pending'),
    ]);

    if (assetsResult.error || approvalsResult.error) {
      throw new InternalServerErrorException(
        'Could not load the dashboard summary.',
      );
    }

    const assets = assetsResult.data ?? [];

    return {
      totalAssets: assets.length,
      operational: assets.filter((asset) => asset.status === 'Operational')
        .length,
      inTransit: assets.filter((asset) => asset.status === 'In transit').length,
      maintenance: assets.filter((asset) => asset.status === 'Maintenance')
        .length,
      pendingApprovals: approvalsResult.data?.length ?? 0,
    };
  }

  @Get('api/transactions')
  async listRegistrationTransactions() {
    const { data, error } = await this.supabase.client
      .from('assets')
      .select(
        'asset_code, chain_asset_id, registration_tx_hash, contract_address, supplier_wallet, created_at',
      )
      .not('registration_tx_hash', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        'Could not load transaction history.',
      );
    }

    return (data ?? []).map((row: any) => ({
      hash: row.registration_tx_hash,
      assetId: row.chain_asset_id || row.asset_code,
      action: 'Asset registered on MST Testnet',
      submittedAt: row.created_at,
      state: 'Confirmed',
      demoOnly: false,
      confirmations: 1,
      from: row.supplier_wallet || 'Unknown wallet',
      to: row.contract_address || undefined,
      explorerUrl: `https://testnet.mstscan.com/tx/${row.registration_tx_hash}`,
    }));
  }

  @Get('api/approvals')
  async listPendingApprovals() {
    const { data, error } = await this.supabase.client
      .from('approvals')
      .select('*, assets(asset_code, name)')
      .eq('status', 'Pending')
      .order('requested_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        'Could not load pending approvals.',
      );
    }

    return (data ?? []).map((approval: any) => ({
      id: approval.approval_code || approval.id,
      assetId: approval.assets?.asset_code || '',
      assetName: approval.assets?.name || 'Unknown asset',
      action: approval.action,
      requestedBy: approval.requested_by,
      role: approval.role,
      requestedAt: approval.requested_at,
      priority: approval.priority,
      status: approval.status,
    }));
  }

  @Get('api/assets/:id')
  async getAsset(@Param('id') id: string) {
    const { data: row, error } = await this.supabase.client
      .from('assets')
      .select('*, asset_events(*), document_proofs(*)')
      .eq('asset_code', id)
      .neq('status', 'DRAFT')
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('Could not load this asset.');
    }

    if (!row) {
      throw new NotFoundException('Asset not found.');
    }

    const documents = row.document_proofs ?? [];
    const events = row.asset_events ?? [];

    return {
      id: row.asset_code || row.id,
      name: row.name || row.equipment_type || 'Unnamed equipment',
      category: row.category || row.equipment_type || 'Uncategorized',
      serial: row.serial || row.asset_code || '',
      supplier: row.supplier || row.supplier_wallet || 'Unknown supplier',
      registeredAt: row.registered_at || row.created_at,
      status: row.status,
      custodian: row.current_custodian_wallet || 'Unassigned',
      custodianRole: row.custodian_role || 'Depot officer',
      certificateCount: documents.length,
      health: row.health ?? 100,
      documents: documents.map((document: any) => ({
        id: document.id,
        type: document.document_type,
        hash: document.document_hash,
        issuedBy: document.issued_by,
        issuedAt: document.issued_at,
        verified: document.verified,
        metadata: document.metadata || '',
      })),
      events: events.map((event: any) => ({
        id: event.id,
        type: event.event_type,
        title: event.title || event.event_type,
        description: event.description || '',
        actorRole: event.actor_role || 'Auditor',
        actorLabel: event.actor_label || event.actor_wallet,
        timestamp: event.occurred_at || event.created_at,
        txHash: event.transaction_hash || undefined,
        state: event.state || 'Confirmed',
        from: event.from_label || event.from_custodian_wallet || undefined,
        to: event.to_label || event.to_custodian_wallet || undefined,
      })),
    };
  }

  @Get('api/assets')
  async listAssets(@Query('q') searchText = '') {
    const { data, error } = await this.supabase.client
      .from('assets')
      .select('*, asset_events(*), document_proofs(*)')
      .neq('status', 'DRAFT')
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Could not load assets.');
    }

    const search = searchText.trim().toLowerCase();

    const matchingRows = (data ?? []).filter((row: any) => {
      const searchableText = [
        row.asset_code,
        row.name,
        row.equipment_type,
        row.serial,
        row.supplier,
        row.supplier_wallet,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return !search || searchableText.includes(search);
    });

    const pageSize = 50;

    const items = matchingRows.slice(0, pageSize).map((row: any) => {
      const documents = row.document_proofs ?? [];
      const events = row.asset_events ?? [];

      return {
        id: row.asset_code || row.id,
        name: row.name || row.equipment_type || 'Unnamed equipment',
        category: row.category || row.equipment_type || 'Uncategorized',
        serial: row.serial || row.asset_code || '',
        supplier: row.supplier || row.supplier_wallet || 'Unknown supplier',
        registeredAt: row.registered_at || row.created_at,
        status: row.status,
        custodian: row.current_custodian_wallet || 'Unassigned',
        custodianRole: row.custodian_role || 'Depot officer',
        certificateCount: documents.length,
        health: row.health ?? 100,
        documents: documents.map((document: any) => ({
          id: document.id,
          type: document.document_type,
          hash: document.document_hash,
          issuedBy: document.issued_by,
          issuedAt: document.issued_at,
          verified: document.verified,
          metadata: document.metadata || '',
        })),
        events: events.map((event: any) => ({
          id: event.id,
          type: event.event_type,
          title: event.title || event.event_type,
          description: event.description || '',
          actorRole: event.actor_role || 'Auditor',
          actorLabel: event.actor_label || event.actor_wallet,
          timestamp: event.occurred_at || event.created_at,
          txHash: event.transaction_hash || undefined,
          state: event.state || 'Confirmed',
          from: event.from_label || event.from_custodian_wallet || undefined,
          to: event.to_label || event.to_custodian_wallet || undefined,
        })),
      };
    });

    return {
      items,
      total: matchingRows.length,
      page: 1,
      pageSize,
    };
  }

  @Post('api/assets')
  async createAssetDraft(@Body() body: CreateAssetRequest) {
    this.ensureWritesAllowed();
    if (
      typeof body.assetCode !== 'string' ||
      typeof body.equipmentType !== 'string' ||
      body.assetCode.trim() === '' ||
      body.equipmentType.trim() === ''
    ) {
      throw new ConflictException(
        'assetCode and equipmentType are required text fields.',
      );
    }

    const supplier =
      typeof body.supplierWallet === 'string' && body.supplierWallet.trim()
        ? body.supplierWallet.trim()
        : 'Unknown supplier';

    const { data: asset, error: assetError } = await this.supabase.client
      .from('assets')
      .insert({
        asset_code: body.assetCode.trim(),
        equipment_type: body.equipmentType.trim(),
        name: body.equipmentType.trim(),
        serial: body.assetCode.trim(),
        manufacturer:
          typeof body.manufacturer === 'string'
            ? body.manufacturer.trim() || null
            : null,
        supplier_wallet:
          typeof body.supplierWallet === 'string'
            ? body.supplierWallet.trim().toLowerCase() || null
            : null,
        supplier,
        status: 'DRAFT',
        chain_asset_id:
          typeof body.chainAssetId === 'string'
            ? body.chainAssetId.trim() || null
            : null,
        registration_tx_hash:
          typeof body.registrationTxHash === 'string'
            ? body.registrationTxHash.trim() || null
            : null,
        chain_id:
          typeof body.chainId === 'number' && Number.isInteger(body.chainId)
            ? body.chainId
            : null,
        contract_address:
          typeof body.contractAddress === 'string'
            ? body.contractAddress.trim() || null
            : null,
      })
      .select('*')
      .single();

    if (assetError?.code === '23505') {
      throw new ConflictException('That asset code already exists.');
    }

    if (assetError || !asset) {
      throw new InternalServerErrorException('Could not save the asset draft.');
    }

    const approvalCode = `APR-${Date.now()}`;

    const { data: approval, error: approvalError } = await this.supabase.client
      .from('approvals')
      .insert({
        approval_code: approvalCode,
        asset_id: asset.id,
        action: 'Approve asset registration',
        requested_by: supplier,
        role: 'Supplier',
        priority: 'Normal',
        status: 'Pending',
      })
      .select('*')
      .single();

    if (approvalError || !approval) {
      await this.supabase.client.from('assets').delete().eq('id', asset.id);

      throw new InternalServerErrorException(
        'The asset approval request could not be saved. The draft was removed.',
      );
    }

    return {
      asset,
      approval,
    };
  }

  @Patch('api/approvals/:approvalCode')
  async updateApproval(
    @Param('approvalCode') approvalCode: string,
    @Body() body: { status: string },
  ) {
    this.ensureWritesAllowed();
    if (body.status !== 'Approved' && body.status !== 'Rejected') {
      throw new ConflictException('Status must be Approved or Rejected.');
    }

    const { data, error } = await this.supabase.client
      .from('approvals')
      .update({ status: body.status })
      .eq('approval_code', approvalCode)
      .eq('status', 'Pending')
      .select('*')
      .single();

    if (error || !data) {
      throw new ConflictException(
        'Approval was not found or has already been decided.',
      );
    }

    if (body.status === 'Approved') {
      const { error: assetUpdateError } = await this.supabase.client
        .from('assets')
        .update({ status: 'Operational' })
        .eq('id', data.asset_id)
        .eq('status', 'DRAFT');

      if (assetUpdateError) {
        throw new InternalServerErrorException(
          'Approval was saved, but the asset status could not be updated.',
        );
      }
    }

    return data;
  }
}