import { CdklabsConstructLibrary } from "cdklabs-projen-project-types";
const project = new CdklabsConstructLibrary({
  author: "AWS",
  authorAddress: "aws-cdk-dev@amazon.com",
  cdkVersion: "2.1.0",
  defaultReleaseBranch: "main",
  devDeps: ["cdklabs-projen-project-types"],
  name: "@cdklabs/cdk-appmod-catalog-blueprints",
  projenrcTs: true,
  release: false,
});
project.synth();