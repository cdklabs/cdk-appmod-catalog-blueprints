# Contributing Guidelines

Thank you for your interest in contributing to AppMod Catalog Blueprints! We welcome contributions from the community to help improve and expand this library of infrastructure blueprints.

Please read through this document before submitting any issues or pull requests to ensure we have all the necessary information to effectively respond to your contribution.

## Reporting Bugs/Feature Requests

We welcome you to use the GitHub issue tracker to report bugs or suggest features.

When filing an issue, please check existing open, or recently closed, issues to make sure somebody else hasn't already reported the issue. Please try to include as much information as you can. Details like these are incredibly useful:

* A reproducible test case or series of steps
* The version of our code being used
* Any modifications you've made relevant to the bug
* Anything unusual about your environment or deployment
* CDK and Node.js versions
* AWS region and account configuration

## Getting Started

### Prerequisites

- Node.js 18+
- AWS CLI configured with appropriate permissions
- CDK CLI installed: `npm install -g aws-cdk`
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/cdk-appmod-catalog-blueprints.git
   cd cdk-appmod-catalog-blueprints
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build Project**
   ```bash
   npx projen build
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## Contributing via Pull Requests

Contributions via pull requests are much appreciated. Before sending us a pull request, please ensure that:

1. You are working against the latest source on the *main* branch.
2. You check existing open, and recently merged, pull requests to make sure someone else hasn't addressed the problem already.
3. You open an issue to discuss any significant work - we would hate for your time to be wasted.

To send us a pull request, please:

1. Fork the repository.
2. Modify the source; please focus on the specific change you are contributing. If you also reformat all the code, it will be hard for us to focus on your change.
3. Ensure local tests pass and CDK Nag compliance checks pass.
4. Commit to your fork using clear commit messages.
5. Send us a pull request, answering any default questions in the pull request interface.
6. Pay attention to any automated CI failures reported in the pull request, and stay involved in the conversation.

GitHub provides additional document on [forking a repository](https://help.github.com/articles/fork-a-repo/) and [creating a pull request](https://help.github.com/articles/creating-a-pull-request/).

## How to Contribute

### Adding New Use Cases

1. **Create Directory Structure**
   ```
   use-cases/your-use-case/
   ├── README.md
   ├── your-construct.ts
   ├── your-construct.test.ts
   └── index.ts
   ```

2. **Follow Naming Conventions**
   - Use kebab-case for directories
   - Use PascalCase for construct classes
   - Include comprehensive documentation

3. **Required Components**
   - Construct implementation with proper interfaces
   - Unit tests with >80% coverage
   - CDK Nag compliance tests
   - Comprehensive README with examples

### Adding Examples

1. **Create Example Directory**
   ```
   examples/category/example-name/
   ├── README.md
   ├── app.ts
   ├── package.json
   └── sample-files/ (if applicable)
   ```

2. **Example Requirements**
   - Complete CDK application
   - 3-command deployment (`npm install && npm run build && npm run deploy`)
   - Sample data or files
   - Clear usage instructions
   - Cleanup instructions

### Code Standards

#### Security Requirements
- **CDK Nag Compliance**: All components must pass CDK Nag security checks
- **Least Privilege**: IAM policies should follow principle of least privilege
- **Encryption**: Enable encryption at rest and in transit where applicable
- **No Hardcoded Secrets**: Use AWS Secrets Manager or Parameter Store

#### Testing Requirements
```bash
# Run all tests
npm test

# Run specific test pattern
npm test -- --testPathPattern="your-construct"

# Generate CDK Nag compliance reports
npm test -- --testPathPattern="nag.test.ts"
```

## Finding Contributions to Work On

Looking at the existing issues is a great way to find something to contribute on. As our project uses the default GitHub issue labels (enhancement/bug/duplicate/help wanted/invalid/question/wontfix), looking at any 'help wanted' issues is a great place to start.

You can also:
- Improve documentation and examples
- Add new use case constructs
- Enhance existing constructs with additional features
- Add support for new AWS services

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](https://aws.github.io/code-of-conduct).
For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq) or contact
opensource-codeofconduct@amazon.com with any additional questions or comments.

## Security Issue Notifications

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public GitHub issue.

## Licensing

See the [LICENSE](LICENSE) file for our project's licensing. We will ask you to confirm the licensing of your contribution.

By contributing to AppMod Catalog Blueprints, you agree that your contributions will be licensed under the Apache License 2.0.
