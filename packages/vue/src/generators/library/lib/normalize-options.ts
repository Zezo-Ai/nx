import {
  getProjects,
  logger,
  normalizePath,
  readNxJson,
  Tree,
} from '@nx/devkit';
import {
  determineProjectNameAndRootOptions,
  ensureRootProjectName,
} from '@nx/devkit/src/generators/project-name-and-root-utils';
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

  const fileName = projectNames.projectFileName;

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  let bundler = options.bundler ?? 'none';

  if (bundler === 'none') {
    if (options.publishable) {
      logger.warn(
        `Publishable libraries cannot be used with bundler: 'none'. Defaulting to 'vite'.`
      );
      bundler = 'vite';
    }
  }
  const nxJson = readNxJson(host);

  const addPlugin =
    process.env.NX_ADD_PLUGINS !== 'false' &&
    nxJson.useInferencePlugins !== false;

  const isUsingTsSolutionConfig = isUsingTsSolutionSetup(host);

  const normalized = {
    addPlugin,
    ...options,
    projectName:
      isUsingTsSolutionConfig && !options.name ? importPath : projectName,
    bundler,
    fileName,
    routePath: `/${projectNames.projectFileName}`,
    name: projectName,
    projectRoot,
    parsedTags,
    importPath,
    isUsingTsSolutionConfig,
    useProjectJson: options.useProjectJson ?? !isUsingTsSolutionConfig,
  } as NormalizedSchema;

  // Libraries with a bundler or is publishable must also be buildable.
  normalized.bundler =
    normalized.bundler !== 'none' || options.publishable ? 'vite' : 'none';

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

    try {
      normalized.appMain = appProjectConfig.targets.build.options.main;
      normalized.appSourceRoot = normalizePath(appSourceRoot);
    } catch (e) {
      throw new Error(
        `Could not locate project main for ${options.appProject}`
      );
    }
  }

  return normalized;
}
