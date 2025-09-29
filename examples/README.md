# AppMod Use Case Examples

Ready-to-deploy examples demonstrating the AppMod Use Case Blueprints. Each example is a complete CDK application that you can deploy immediately for evaluation or use as a starting point for your own implementation.

## 🚀 Quick Start

Each example is designed for **3-command deployment**:
```bash
cd examples/{use-case}/{example-name}
npm install && npm run build && npm run deploy
```

## 📋 Available Examples

### 🔍 Document Processing

#### [Basic Example](document-processing/basic/)
**Deploy Time**: ~5 minutes | **Use Case**: Invoice processing, document digitization

- **What it does**: Complete serverless image document processing pipeline
- **Architecture**: S3 → SQS → Step Functions → Lambda → DynamoDB
- **Sample included**: Professional service invoice for testing
- **Perfect for**: Quick evaluation, proof-of-concept, demos

```bash
cd examples/document-processing/basic
npm install && npm run deploy
```

**Expected costs**: ~$1-5/month for light usage

#### Advanced Example (Coming Soon)
- Features (VPC, encryption, monitoring)
- Multi-document type support (PDF, images, forms)
- Human-in-the-loop workflows
- Enterprise security and compliance

### 🌐 Web Application

#### [Frontend Example](frontend-example.ts)
**Deploy Time**: ~3 minutes | **Use Case**: Static website hosting, SPA deployment

- **What it does**: Deploys frontend applications to S3 + CloudFront with custom domains
- **Architecture**: S3 → CloudFront → Route53 (optional)
- **Frameworks supported**: React, Vue, Angular, Next.js, Hugo, and more
- **Perfect for**: Static sites, SPAs, documentation sites

```bash
# Deploy the example (requires customization for your domain)
cd examples
npm install && npx ts-node frontend-example.ts
```

**Features**:
- Automatic build process execution
- Custom domain with SSL certificates
- SPA-friendly error handling
- Security headers injection
- Global CDN distribution

#### [Full-Stack Example](full-stack-example.ts)
**Deploy Time**: ~8 minutes | **Use Case**: Complete web application with backend and frontend

- **What it does**: Deploys a complete web application with ECS backend and S3/CloudFront frontend
- **Architecture**: Frontend (S3 + CloudFront) + Backend (ECS Fargate + RDS + ALB)
- **Perfect for**: Full-stack applications, microservices, production deployments

```bash
# Deploy the example (requires customization for your domain and container image)
cd examples
npm install && npx ts-node full-stack-example.ts
```

**Features**:
- Containerized backend with auto-scaling
- Database with encryption
- Load balancer with SSL/TLS
- Frontend with custom domain
- Security

### 🌐 Web Application (Legacy Examples)

#### Basic Example
- ECS Fargate + RDS deployment
- Load balancer with SSL/TLS
- Auto-scaling configuration

#### Advanced Example  
- Multi-AZ deployment
- CDN integration
- Advanced monitoring and alerting

## 🎯 Example Categories

### **Basic Examples**
- ✅ **Quick Deploy**: 3-5 minutes to running infrastructure
- ✅ **Cost Optimized**: Minimal resources for evaluation
- ✅ **Sample Data**: Realistic test data included
- ✅ **Clear Documentation**: Step-by-step instructions

**Perfect for:**
- Initial evaluation and proof-of-concept
- Demos to stakeholders
- Learning the architecture patterns
- Quick cost and performance assessment

### **Advanced Examples**
- 🏢 **Enterprise Features**: Security, monitoring, compliance
- 🏢 **Scalable**: Multi-AZ, auto-scaling, high availability
- 🏢 **Customizable**: Multiple configuration options
- 🏢 **Enterprise Features**: VPC, encryption, audit logging

**Perfect for:**
- Production deployments
- Enterprise requirements
- Custom implementations
- Long-term solutions

## 🏗️ Architecture Patterns

### Serverless-First
- AWS Lambda for compute
- Managed services (S3, DynamoDB, SQS)
- Event-driven architectures
- Pay-per-use pricing

### Container-Based
- ECS Fargate for applications
- RDS for databases
- Application Load Balancer
- Auto-scaling groups

### Hybrid Approaches
- Serverless for processing
- Containers for applications
- Managed databases
- Event-driven integration

## 💰 Cost Optimization

### Development/Testing
- Use basic examples with minimal resources
- Leverage free tier where possible
- Clean up resources after testing

### Production
- Use advanced examples with cost optimization
- Implement lifecycle policies
- Monitor and optimize regularly

## 🛠️ Customization Guide

### Common Customizations
1. **Region Selection**: Update CDK context or environment variables
2. **Resource Naming**: Modify stack names and resource prefixes
3. **Security Settings**: Adjust IAM policies and encryption settings
4. **Scaling Parameters**: Configure auto-scaling and capacity settings

### Integration Points
- **Existing VPC**: Modify network configuration
- **External Databases**: Update connection strings
- **Monitoring Systems**: Add CloudWatch integration
- **CI/CD Pipelines**: Include deployment automation

## 📊 Monitoring and Observability

All examples include:
- ✅ **CloudWatch Logs**: Centralized logging
- ✅ **CloudWatch Metrics**: Performance monitoring  
- ✅ **AWS X-Ray**: Distributed tracing (where applicable)
- ✅ **CloudFormation Outputs**: Key resource identifiers

Advanced examples add:
- 📊 **Custom Dashboards**: Business metrics visualization
- 🚨 **Alerting**: Proactive issue notification
- 📈 **Cost Tracking**: Resource cost attribution
- 🔍 **Security Monitoring**: Compliance and audit trails

## 🆘 Troubleshooting

### Common Issues

**Deployment Fails**
- Check AWS credentials: `aws sts get-caller-identity`
- Verify region permissions and service availability
- Review CloudFormation events in AWS Console

**High Costs**
- Check resource utilization in CloudWatch
- Review S3 storage classes and lifecycle policies
- Monitor Lambda invocation patterns

**Performance Issues**
- Review CloudWatch metrics and logs
- Check database connection pooling
- Optimize Lambda memory and timeout settings

### Getting Help
1. Check the example's README for specific troubleshooting
2. Review CloudWatch logs for detailed error messages
3. Use AWS Support or community forums for AWS-specific issues
4. Create issues in this repository for example-specific problems

## 🧹 Cleanup

Each example includes cleanup instructions:
```bash
npm run destroy
```

**Important**: Some resources may incur charges until explicitly deleted. Always verify cleanup in the AWS Console.

## 🚀 Next Steps

### After Deploying Examples
1. **Test with your data**: Upload your actual documents/applications
2. **Measure performance**: Evaluate speed, accuracy, cost
3. **Customize for your needs**: Modify configurations and integrations
4. **Plan for production**: Review advanced examples and best practices

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.