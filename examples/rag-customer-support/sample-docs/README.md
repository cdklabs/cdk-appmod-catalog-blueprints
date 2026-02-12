# AcmeShop Sample Documentation

This directory contains sample e-commerce documentation for the AcmeShop customer support knowledge base. These documents are automatically ingested into Amazon Bedrock Knowledge Base during deployment and used by the customer support agent to answer customer questions.

## Purpose

The sample documentation provides realistic e-commerce content that demonstrates:
- How the RAG (Retrieval-Augmented Generation) system retrieves relevant context
- How the customer support agent uses documentation to answer questions
- Best practices for structuring knowledge base content

## Included Documents

| Document | Description |
|----------|-------------|
| [product-catalog.md](./product-catalog.md) | Product categories, descriptions, pricing, and availability information |
| [orders-shipping.md](./orders-shipping.md) | Order placement process, shipping options, tracking, and delivery issues |
| [returns-refunds.md](./returns-refunds.md) | Return policy, refund process, exchange procedures |
| [account-help.md](./account-help.md) | Account registration, password reset, profile management, notifications |
| [faq.md](./faq.md) | Frequently asked questions across all topics |

## Adding Custom Documentation

To add your own documentation:

1. Add markdown files to this directory
2. Re-deploy the stack or run `./sync-kb.sh` to trigger re-ingestion
3. Wait for ingestion to complete (check Bedrock console)
4. Test with relevant questions using `./invoke-agent.sh`

## Best Practices for Knowledge Base Content

- Use clear headings and structure for better chunking
- Include specific details (prices, timeframes, steps)
- Write in a customer-friendly tone
- Keep related information together
- Use lists and tables for easy scanning
