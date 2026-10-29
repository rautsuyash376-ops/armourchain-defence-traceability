# Pull Request Checklist

- [ ] This branch is `feature/defence-equipment-traceability`.
- [ ] Frontend/backend owners reviewed `API_CONTRACT.md`; names and event field order approved.
- [ ] Generate and commit `package-lock.json` from a networked team environment; confirm `npm ci` works from a clean clone.
- [ ] `npm run compile` and `npm test` pass from a clean clone; attach or record the actual results.
- [ ] Regenerate the ABI from compiler artifacts; do not merge the current draft ABI without compiler-generated comparison.
- [ ] ABI regenerated with `npm run export:abi` after all contract edits.
- [ ] Network values are independently confirmed; Testnet deprecation notice has an explicit resolution.
- [ ] No `.env`, real private key, seed phrase, wallet JSON, organizer credential, classified data, or sensitive operational information is included.
- [ ] Deployment JSON contains only real, verified transaction facts (or remains `NOT_DEPLOYED`).
- [ ] Any network deployment was authorized and contract bytecode/source reviewed.
- [ ] Contract has passed the agreed security review before any production use.
- [ ] Team was notified before any ABI or event interface change.
