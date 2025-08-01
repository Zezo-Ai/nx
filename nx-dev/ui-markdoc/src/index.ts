import { Node, RenderableTreeNode } from '@markdoc/markdoc';
import markdoc from '@markdoc/markdoc';
import { load as yamlLoad } from '@zkochan/js-yaml';
import React, { ReactNode } from 'react';
import { Heading } from './lib/nodes/heading.component';
import { getHeadingSchema } from './lib/nodes/heading.schema';
import { getImageSchema } from './lib/nodes/image.schema';
import { CustomLink } from './lib/nodes/link.component';
import { link } from './lib/nodes/link.schema';
import { Callout } from './lib/tags/callout.component';
import { callout } from './lib/tags/callout.schema';
import { CallToAction } from './lib/tags/call-to-action.component';
import { callToAction } from './lib/tags/call-to-action.schema';
import { Card, Cards, LinkCard } from './lib/tags/cards.component';
import { card, cards, linkCard } from './lib/tags/cards.schema';
import { GithubRepository } from './lib/tags/github-repository.component';
import { githubRepository } from './lib/tags/github-repository.schema';
import { StackblitzButton } from './lib/tags/stackblitz-button.component';
import { stackblitzButton } from './lib/tags/stackblitz-button.schema';
import { Graph } from './lib/tags/graph.component';
import { graph } from './lib/tags/graph.schema';
import { Iframe } from './lib/tags/iframe.component';
import { iframe } from './lib/tags/iframe.schema';
import { InstallNxConsole } from './lib/tags/install-nx-console.component';
import { installNxConsole } from './lib/tags/install-nx-console.schema';
import { Persona, Personas } from './lib/tags/personas.component';
import { persona, personas } from './lib/tags/personas.schema';
import { ProjectDetails } from './lib/tags/project-details.component';
import { projectDetails } from './lib/tags/project-details.schema';
import {
  ShortEmbeds,
  shortEmbeds,
  shortVideo,
  ShortVideo,
} from './lib/tags/short-embed';
import { SideBySide } from './lib/tags/side-by-side.component';
import { sideBySide } from './lib/tags/side-by-side.schema';
import { Tab, Tabs } from './lib/tags/tabs.component';
import { tab, tabs } from './lib/tags/tabs.schema';
import { Step, Steps } from './lib/tags/steps.component';
import { step, steps } from './lib/tags/steps.schema';
import { courseVideo } from './lib/tags/course-video.schema';
import { VideoLink, videoLink } from './lib/tags/video-link.component';
import {
  CourseVideo,
  YouTube,
  Tweet,
  youtube,
  tweet,
} from '@nx/nx-dev-ui-common';
// import { SvgAnimation, svgAnimation } from './lib/tags/svg-animation.component';
import { Pill } from './lib/tags/pill.component';
import { pill } from './lib/tags/pill.schema';
import { fence } from './lib/nodes/fence.schema';
import { FenceWrapper } from './lib/nodes/fence-wrapper.component';
import { VideoPlayer, videoPlayer } from './lib/tags/video-player.component';
import { TableOfContents } from './lib/tags/table-of-contents.component';
import { tableOfContents } from './lib/tags/table-of-contents.schema';
import { Testimonial, testimonial } from './lib/tags/testimonial.component';
import { metrics } from './lib/tags/metrics.schema';
import { Metrics } from './lib/tags/metrics.component';
export { CallToAction };

const { parse, renderers, Tokenizer, transform } = markdoc;

export const getMarkdocCustomConfig = (
  documentFilePath: string,
  headingClass: string = ''
): { config: any; components: any } => ({
  config: {
    nodes: {
      fence,
      heading: getHeadingSchema(headingClass),
      image: getImageSchema(documentFilePath),
      link,
    },
    tags: {
      callout,
      'call-to-action': callToAction,
      card,
      cards,
      'link-card': linkCard,
      'github-repository': githubRepository,
      'stackblitz-button': stackblitzButton,
      graph,
      iframe,
      'install-nx-console': installNxConsole,
      'video-player': videoPlayer,
      persona,
      personas,
      'project-details': projectDetails,
      pill,
      'short-embeds': shortEmbeds,
      'short-video': shortVideo,
      'side-by-side': sideBySide,
      step,
      steps,
      tab,
      tabs,
      testimonial,
      toc: tableOfContents,
      tweet,
      youtube,
      'course-video': courseVideo,
      'video-link': videoLink,
      metrics,
      // 'svg-animation': svgAnimation,
    },
  },
  components: {
    Callout,
    CallToAction,
    Card,
    Cards,
    LinkCard,
    CustomLink,
    FenceWrapper,
    GithubRepository,
    StackblitzButton,
    Graph,
    Heading,
    Iframe,
    InstallNxConsole,
    Persona,
    Personas,
    ProjectDetails,
    Pill,
    ShortEmbeds,
    ShortVideo,
    SideBySide,
    Step,
    Steps,
    Tab,
    Tabs,
    TableOfContents,
    Testimonial,
    Tweet,
    YouTube,
    CourseVideo,
    VideoLink,
    VideoPlayer,
    Metrics,
    // SvgAnimation,
  },
});

const tokenizer = new Tokenizer({
  // Per https://markdoc.dev/docs/syntax#comments this will be on by default in a future version
  allowComments: true,
});

const parseMarkdown: (markdown: string) => Node = (markdown) => {
  const tokens = tokenizer.tokenize(markdown);
  return parse(tokens);
};

export const extractFrontmatter = (
  documentContent: string
): Record<string, any> => {
  const ast = parseMarkdown(documentContent);
  const frontmatter = ast.attributes['frontmatter']
    ? (yamlLoad(ast.attributes['frontmatter']) as Record<string, any>)
    : {};
  return frontmatter;
};

export const renderMarkdown: (
  documentContent: string,
  options: { filePath: string; headingClass?: string }
) => {
  metadata: Record<string, any>;
  node: ReactNode;
  treeNode: RenderableTreeNode;
} = (documentContent, options = { filePath: '' }) => {
  const ast = parseMarkdown(documentContent);
  const configuration = getMarkdocCustomConfig(
    options.filePath,
    options.headingClass
  );
  const treeNode = transform(ast, configuration.config);

  return {
    metadata: ast.attributes['frontmatter']
      ? (yamlLoad(ast.attributes['frontmatter']) as Record<string, any>)
      : {},
    node: renderers.react(transform(ast, configuration.config), React, {
      components: configuration.components,
    }),
    treeNode,
  };
};

export { Metrics, VideoLink, GithubRepository /*, CourseVideo*/ };
