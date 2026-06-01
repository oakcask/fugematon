export type RuntimeSoftwareNotice = {
  name: string;
  version: string;
  license: string;
  homepage: string;
  notice: string;
};

export type AudioAssetNotice = {
  assetId: string;
  sourceTitle: string;
  sourceUrl: string;
  license: string;
  attribution: string;
  attributionRequired: boolean;
  distributed: boolean;
};

export type NoticesData = {
  software: readonly RuntimeSoftwareNotice[];
  audioAssets: readonly AudioAssetNotice[];
};

export const noticesData: NoticesData = {
  software: [
    {
      name: "spessasynth_lib",
      version: "4.3.6",
      license: "Apache-2.0",
      homepage: "https://github.com/spessasus/spessasynth_lib",
      notice: "Copyright 2026 Spessasus. Licensed under the Apache License, Version 2.0.",
    },
    {
      name: "spessasynth_core",
      version: "4.3.7",
      license: "Apache-2.0",
      homepage: "https://github.com/spessasus/spessasynth_core",
      notice: "Copyright 2026 Spessasus. Licensed under the Apache License, Version 2.0.",
    },
  ],
  audioAssets: [],
};

export function assertValidNoticesData(data: NoticesData = noticesData): void {
  const errors = validateNoticesData(data);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

export function validateNoticesData(data: NoticesData): string[] {
  const errors: string[] = [];

  for (const software of data.software) {
    if (
      isBlank(software.name) ||
      isBlank(software.version) ||
      isBlank(software.license) ||
      isBlank(software.homepage) ||
      isBlank(software.notice)
    ) {
      errors.push(
        "web.notices.missing-software-metadata: runtime software notice is incomplete; why=distributed packages need release notices; action=add name, version, license, and homepage metadata",
      );
    }
  }

  for (const asset of data.audioAssets) {
    if (!asset.distributed) {
      continue;
    }
    if (isBlank(asset.assetId) || isBlank(asset.sourceTitle) || isBlank(asset.sourceUrl) || isBlank(asset.license)) {
      errors.push(
        "web.notices.missing-audio-asset-metadata: distributed audio asset notice is incomplete; why=audio assets need source and license metadata before release; action=add asset id, source title, source URL, and license metadata",
      );
    }
  }

  return errors;
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}
