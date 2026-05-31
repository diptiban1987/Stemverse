export type PluginManifest = {
  name: string;
  slug: string;
  version: string;
  author: string;
  description: string;
  category: string;
  blocks?: string[];
  generators?: string[];
  assets?: string[];
  docs?: string[];
};

export type PluginPackageLayout = {
  manifest: PluginManifest;
  blocksDir?: string;
  generatorsDir?: string;
  assetsDir?: string;
  docsDir?: string;
};

const REQUIRED = ['name', 'slug', 'version', 'author', 'description', 'category'] as const;

export function validatePluginManifest(input: unknown): {
  valid: boolean;
  manifest?: PluginManifest;
  errors: string[];
} {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['plugin.json must be a JSON object'] };
  }
  const raw = input as Record<string, unknown>;
  for (const key of REQUIRED) {
    if (typeof raw[key] !== 'string' || !(raw[key] as string).trim()) {
      errors.push(`Missing or invalid field: ${key}`);
    }
  }
  const slug = String(raw.slug ?? '');
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push('slug must be kebab-case (e.g. stemverse-dht-pack)');
  }
  const version = String(raw.version ?? '');
  if (version && !/^\d+\.\d+\.\d+/.test(version)) {
    errors.push('version should follow semver (e.g. 1.0.0)');
  }
  const manifest: PluginManifest = {
    name: String(raw.name),
    slug,
    version: String(raw.version),
    author: String(raw.author),
    description: String(raw.description),
    category: String(raw.category),
    blocks: arrayOfStrings(raw.blocks),
    generators: arrayOfStrings(raw.generators),
    assets: arrayOfStrings(raw.assets),
    docs: arrayOfStrings(raw.docs),
  };
  return { valid: errors.length === 0, manifest, errors };
}

function arrayOfStrings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map(String);
}

export const PLUGIN_SDK_LAYOUT = [
  'plugin.json',
  'blocks/',
  'generators/',
  'assets/',
  'docs/',
] as const;
