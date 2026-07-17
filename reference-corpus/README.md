# Reference Corpus

`manifest.json` records stable source identity, rights boundaries, intended feature use, and leakage-safe splits.

The encoded scores are user-obtained inputs and are not committed. Download the pinned `sourceUrl`, verify its declared checksum, then run:

```text
pnpm fugematon reference-import --manifest reference-corpus/manifest.json --work-id <work-id> --source <downloaded-file> --out <output-directory>
```

The importer writes a normalized score and contextual feature vector. Do not commit imported scores unless the manifest explicitly marks that encoding redistributable.
