import { strings } from '@angular-devkit/core';
import {
  apply,
  chain,
  externalSchematic,
  MergeStrategy,
  mergeWith,
  move,
  Rule,
  SchematicContext,
  template,
  Tree,
  url,
} from '@angular-devkit/schematics';
import { createOrUpdate, deleteFile, formatFiles, getProjectConfig } from '@nrwl/workspace';
import * as fs from 'fs';
import * as path from 'path';

import { ISchematicContext } from './schema.interface';

interface IProjectConfig {
  root: string;
  sourceRoot: string;
  projectType: string;
  prefix: string;
  architect: {
    lint: {
      builder: string;
      options: {
        eslintConfig: string;
        lintFilePatterns: string[];
      } & Record<string, string>;
    };
    test: {
      builder: string;
      outputs: string[];
      options: {
        jestConfig: string;
        passWithNoTests: boolean;
      };
    };
  };
}

const addFiles =
  (schema: ISchematicContext): Rule =>
  (tree: Tree, context: SchematicContext) => {
    const projectConfig: IProjectConfig = getProjectConfig(tree, schema.name);

    const templateSource = apply(url('./files'), [
      move(projectConfig.root),
      template({
        ...strings,
        ...schema, // pass the objects containing the properties & functions to be used in template files.
        tmpl: '', // this value is used to files naming to that template files do not affect development processes.
      }),
    ]);

    return chain([mergeWith(templateSource, MergeStrategy.Overwrite)])(tree, context);
  };

/**
 * Updates angular.json
 */
const updateProjectConfig =
  (schema: ISchematicContext): Rule =>
  (tree: Tree, context: SchematicContext) => {
    const projectConfig: IProjectConfig = getProjectConfig(tree, schema.name);
    projectConfig.architect.lint.builder = '@angular-eslint/builder:lint';
    projectConfig.architect.lint.options.lintFilePatterns = [`libs/${schema.name}/src/**/*.ts`];

    const projectRoot = `${process.cwd()}`;
    const angularJsonPath = `${projectRoot}/angular.json`;

    const angularJson: Record<string, Record<string, unknown>> = JSON.parse(fs.readFileSync(angularJsonPath)?.toString() ?? '{}');
    angularJson.projects[schema.name] = projectConfig;

    createOrUpdate(tree, './angular.json', JSON.stringify(angularJson));

    return chain([formatFiles({ skipFormat: false }, './angular.json')])(tree, context);
  };

/**
 * Removes unneeded files.
 */
const cleanup =
  (schema: ISchematicContext): Rule =>
  (tree: Tree, context: SchematicContext) => {
    return chain([deleteFile('./.eslintrc.json')])(tree, context);
  };

export default function (schema: ISchematicContext) {
  return (tree: Tree, context: SchematicContext) => {
    const name = schema.name;
    const tags = schema.tags;

    return chain([
      chain([
        externalSchematic('@nrwl/angular', 'lib', {
          name,
          tags,
        }),
        addFiles(schema),
        externalSchematic('@schematics/angular', 'component', {
          project: name,
          name,
          path: path.join('libs', name, 'src', 'lib', 'components'),
          style: 'scss',
        }),
        externalSchematic('@schematics/angular', 'service', {
          project: name,
          name,
          path: path.join('libs', name, 'src', 'lib', 'services'),
        }),
        externalSchematic('@schematics/angular', 'guard', {
          project: name,
          name,
          path: path.join('libs', name, 'src', 'lib', 'guards'),
        }),
      ]),
      updateProjectConfig(schema),
      cleanup(schema),
    ])(tree, context);
  };
}
