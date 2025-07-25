import {
  formatFiles,
  getProjects,
  joinPathFragments,
  ProjectConfiguration,
  Tree,
  visitNotIgnoredFiles,
} from '@nx/devkit';
import { ensureTypescript } from '@nx/js/src/utils/typescript/ensure-typescript';
import {
  getProjectSourceRoot,
  getProjectType,
} from '@nx/js/src/utils/typescript/ts-solution-setup';
import { minimatch } from 'minimatch';
import { basename, join } from 'path';
import {
  findExportDeclarationsForJsx,
  getComponentNode,
} from '../../utils/ast-utils';
import { getUiFramework } from '../../utils/framework';
import componentStoryGenerator from '../component-story/component-story';

let tsModule: typeof import('typescript');

export interface StorybookStoriesSchema {
  project: string;
  interactionTests?: boolean;
  js?: boolean;
  ignorePaths?: string[];
  uiFramework?: string;
  skipFormat?: boolean;
}

export async function projectRootPath(
  tree: Tree,
  config: ProjectConfiguration
): Promise<string> {
  let projectDir: string;
  if (getProjectType(tree, config.root, config.projectType) === 'application') {
    const isNextJs = await isNextJsProject(tree, config);
    if (isNextJs) {
      // Next.js apps
      projectDir = 'components';
    } else {
      // apps/test-app/src/app
      projectDir = 'app';
    }
  } else if (config.projectType == 'library') {
    // libs/test-lib/src/lib
    projectDir = 'lib';
  } else {
    projectDir = '.';
  }
  return joinPathFragments(getProjectSourceRoot(config, tree), projectDir);
}

export function containsComponentDeclaration(
  tree: Tree,
  componentPath: string
): boolean {
  if (!tsModule) {
    tsModule = ensureTypescript();
  }

  const contents = tree.read(componentPath, 'utf-8');
  if (contents === null) {
    throw new Error(`Failed to read ${componentPath}`);
  }

  const sourceFile = tsModule.createSourceFile(
    componentPath,
    contents,
    tsModule.ScriptTarget.Latest,
    true
  );

  return !!(
    getComponentNode(sourceFile) ||
    findExportDeclarationsForJsx(sourceFile)?.length
  );
}

export async function createAllStories(
  tree: Tree,
  schema: StorybookStoriesSchema,
  projectConfiguration: ProjectConfiguration
) {
  const { isTheFileAStory } = await import('@nx/storybook/src/utils/utilities');

  const sourceRoot = getProjectSourceRoot(projectConfiguration, tree);
  let componentPaths: string[] = [];

  const projectPath = await projectRootPath(tree, projectConfiguration);
  visitNotIgnoredFiles(tree, projectPath, (path) => {
    // Ignore private files starting with "_".
    if (basename(path).startsWith('_')) return;

    if (schema.ignorePaths?.some((pattern) => minimatch(path, pattern))) return;

    if (
      (path.endsWith('.tsx') && !path.endsWith('.spec.tsx')) ||
      (path.endsWith('.js') && !path.endsWith('.spec.js')) ||
      (path.endsWith('.jsx') && !path.endsWith('.spec.jsx'))
    ) {
      // Check if file is NOT a story (either ts/tsx or js/jsx)
      if (!isTheFileAStory(tree, path)) {
        // Since the file is not a story
        // Let's see if the .stories.* file exists
        const ext = path.slice(path.lastIndexOf('.'));
        const storyPath = `${path.split(ext)[0]}.stories${ext}`;

        if (!tree.exists(storyPath)) {
          componentPaths.push(path);
        }
      }
    }
  });

  await Promise.all(
    componentPaths.map(async (componentPath) => {
      const relativeCmpDir = componentPath.replace(
        `${sourceRoot.replace(/^\.\//, '')}/`,
        ''
      );

      if (!containsComponentDeclaration(tree, componentPath)) {
        return;
      }

      await componentStoryGenerator(tree, {
        componentPath: relativeCmpDir,
        project: schema.project,
        interactionTests: schema.interactionTests,
        uiFramework: schema.uiFramework,
        skipFormat: true,
      });
    })
  );
}

export async function storiesGenerator(
  host: Tree,
  schema: StorybookStoriesSchema
) {
  const projects = getProjects(host);
  const projectConfiguration = projects.get(schema.project);
  schema.interactionTests = schema.interactionTests ?? true;
  schema.uiFramework ??= getUiFramework(host, schema.project);
  await createAllStories(host, schema, projectConfiguration);

  if (!schema.skipFormat) {
    await formatFiles(host);
  }
}

async function isNextJsProject(tree: Tree, config: ProjectConfiguration) {
  const { findStorybookAndBuildTargetsAndCompiler } = await import(
    '@nx/storybook/src/utils/utilities'
  );

  const { nextBuildTarget } = findStorybookAndBuildTargetsAndCompiler(
    config.targets
  );
  if (nextBuildTarget) {
    return true;
  }

  for (const configFile of ['next.config.js', 'next.config.ts']) {
    if (tree.exists(join(config.root, configFile))) {
      return true;
    }
  }

  return false;
}

export default storiesGenerator;
