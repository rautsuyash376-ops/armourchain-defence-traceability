# Deployment records

Network-specific JSON files are updated by `scripts/deploy.cjs` only after a successful mined deployment receipt is obtained. They must contain real contract addresses, transaction hashes, block numbers, deployer address, and explorer links. Keep them as `NOT_DEPLOYED` until deployment actually occurs. Do not hand-edit placeholders into realistic-looking values.
