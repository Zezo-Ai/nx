import {
  getProjects,
  joinPathFragments,
  logger,
  normalizePath,
  readNxJson,
  Tree,
} from '@nx/devkit';
import {
  determineProjectNameAndRootOptions,
  ensureRootProjectName,
} from '@nx/devkit/src/generators/project-name-and-root-utils';
import { assertValidStyle } from '../../../utils/assertion';
import { NormalizedSchema, Schema } from '../schema';
import {
  getProjectSourceRoot,
  getProjectType,
  isUsingTsSolutionSetup,
} from '@nx/js/src/utils/typescript/ts-solution-setup';

export async function normalizeOptions(
  host: Tree,
  options: Schema
): Promise<NormalizedSchema> {
  const isUsingTsSolutionConfig = isUsingTsSolutionSetup(host);

  await ensureRootProjectName(options, 'library');
  const {
    projectName,
    names: projectNames,
    projectRoot,
    importPath,
  } = await determineProjectNameAndRootOptions(host, {
    name: options.name,
    projectType: 'library',
    directory: options.directory,
    importPath: options.importPath,
  });
  const nxJson = readNxJson(host);
  const addPlugin =
    process.env.NX_ADD_PLUGINS !== 'false' &&
    nxJson.useInferencePlugins !== false;

  options.addPlugin ??= addPlugin;

  const fileName = options.simpleName
    ? projectNames.projectSimpleName
    : projectNames.projectFileName;

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  let bundler = options.bundler ?? 'none';

  if (bundler === 'none') {
    if (options.publishable) {
      logger.warn(
        `Publishable libraries cannot be used with bundler: 'none'. Defaulting to 'rollup'.`
      );
      bundler = 'rollup';
    }
    if (options.buildable) {
      logger.warn(
        `Buildable libraries cannot be used with bundler: 'none'. Defaulting to 'rollup'.`
      );
      bundler = 'rollup';
    }
  }

  const normalized = {
    ...options,
    compiler: options.compiler ?? 'babel',
    bundler,
    fileName,
    routePath: `/${projectNames.projectSimpleName}`,
    name: isUsingTsSolutionConfig && !options.name ? importPath : projectName,
    projectRoot,
    parsedTags,
    importPath,
    useProjectJson: options.useProjectJson ?? !isUsingTsSolutionConfig,
  } as NormalizedSchema;

  // Libraries with a bundler or is publishable must also be buildable.
  normalized.buildable = Boolean(
    normalized.bundler !== 'none' || options.buildable || options.publishable
  );

  normalized.inSourceTests === normalized.minimal || normalized.inSourceTests;

  if (options.appProject) {
    const appProjectConfig = getProjects(host).get(options.appProject);
    const appProjectType = getProjectType(
      host,
      appProjectConfig.root,
      appProjectConfig.projectType
    );

    if (appProjectType !== 'application') {
      throw new Error(
        `appProject expected type of "application" but got "${appProjectType}"`
      );
    }

    const appSourceRoot = getProjectSourceRoot(appProjectConfig, host);

    normalized.appMain =
      appProjectConfig.targets.build?.options?.main ??
      findMainEntry(host, appProjectConfig.root);
    normalized.appSourceRoot = normalizePath(appSourceRoot);

    // TODO(jack): We should use appEntryFile instead of appProject so users can directly set it rather than us inferring it.
    if (!normalized.appMain) {
      throw new Error(
        `Could not locate project main for ${options.appProject}`
      );
    }
  }

  assertValidStyle(normalized.style);

  normalized.isUsingTsSolutionConfig = isUsingTsSolutionConfig;

  return normalized;
}

function findMainEntry(tree: Tree, projectRoot: string): string | undefined {
  const mainFiles = [
    // These are the main files we generate with.
    'src/main.ts',
    'src/main.tsx',
    'src/main.js',
    'src/main.jsx',
    // Other options just in case
    'src/index.ts',
    'src/index.tsx',
    'src/index.js',
    'src/index.jsx',
    'main.ts',
    'main.tsx',
    'main.js',
    'main.jsx',
    'index.ts',
    'index.tsx',
    'index.js',
    'index.jsx',
  ];
  const mainEntry = mainFiles.find((file) =>
    tree.exists(joinPathFragments(projectRoot, file))
  );
  return mainEntry ? joinPathFragments(projectRoot, mainEntry) : undefined;
}
