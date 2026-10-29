import {
  BrowserProvider,
  Contract,
  hexlify,
  keccak256,
  randomBytes,
  toUtf8Bytes,
  ZeroHash,
} from 'ethers';
import { config } from './config';
import abiText from './contract-abi.json?raw';

const contractAbi = JSON.parse(abiText);

type InjectedWallet = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isBridgeKey?: boolean;
  providers?: InjectedWallet[];
};

type WalletAnnouncement = {
  info?: {
    name?: string;
    rdns?: string;
  };
  provider?: InjectedWallet;
};

async function findBridgeKey(): Promise<InjectedWallet> {
  const announcedWallets: InjectedWallet[] = [];

  const onWalletAnnouncement = (event: Event) => {
    const detail = (event as CustomEvent<WalletAnnouncement>).detail;
    const name = `${detail?.info?.name ?? ''} ${detail?.info?.rdns ?? ''}`;

    if (/bridge\s?key/i.test(name) && detail?.provider) {
      announcedWallets.push(detail.provider);
    }
  };

  window.addEventListener('eip6963:announceProvider', onWalletAnnouncement);
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  // Give installed wallet extensions a moment to answer.
  await new Promise((resolve) => window.setTimeout(resolve, 500));

  window.removeEventListener('eip6963:announceProvider', onWalletAnnouncement);

  if (announcedWallets.length > 0) {
    return announcedWallets[0];
  }

  const injected = (window as Window & { ethereum?: InjectedWallet }).ethereum;
  const providers = injected?.providers ?? (injected ? [injected] : []);
  const bridgeKey = providers.find((wallet) => wallet.isBridgeKey === true);

  if (bridgeKey) {
    return bridgeKey;
  }

  throw new Error(
    'BridgeKey was not detected. Make sure its extension is enabled, then refresh the app.',
  );
}

export async function connectDefenceContract() {
  if (!config.contractAddress || !config.chainId) {
    throw new Error('Contract settings are missing from the frontend .env file.');
  }

  const bridgeKey = await findBridgeKey();
  const provider = new BrowserProvider(bridgeKey as any);

  await provider.send('eth_requestAccounts', []);

  const network = await provider.getNetwork();

  if (Number(network.chainId) !== config.chainId) {
    throw new Error('Switch BridgeKey to MST Testnet, then try again.');
  }

  const signer = await provider.getSigner();
  const contract = new Contract(config.contractAddress, contractAbi, signer);

  return {
    contract,
    walletAddress: await signer.getAddress(),
  };
}
export async function registerAssetOnChain(name: string, category: string) {
  const { contract, walletAddress } = await connectDefenceContract();

  const assetId = hexlify(randomBytes(32));
  const classCodeHash = keccak256(toUtf8Bytes(category));
  const metadataHash = keccak256(toUtf8Bytes(`${name}|${category}`));

  const transaction = await contract.registerAsset(
    assetId,
    ZeroHash,
    0,
    classCodeHash,
    metadataHash,
    walletAddress,
  );

  const receipt = await transaction.wait();

  if (!receipt || receipt.status !== 1) {
    throw new Error('The asset registration transaction did not succeed.');
  }

  return {
    assetId,
    transactionHash: transaction.hash,
    blockNumber: receipt.blockNumber,
    walletAddress,
  };
}