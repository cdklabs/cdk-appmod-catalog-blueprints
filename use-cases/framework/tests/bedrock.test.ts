import { Stack } from 'aws-cdk-lib';
import { FoundationModelIdentifier } from 'aws-cdk-lib/aws-bedrock';
import { BedrockCrossRegionInferencePrefix, BedrockModelUtils } from '../bedrock/bedrock';

describe('BedrockModelUtils', () => {
  let stack: Stack;
  const testModel = FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0;

  beforeEach(() => {
    stack = new Stack(undefined, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
  });

  test('deriveActualModelId returns model ID without cross-region inference', () => {
    const modelId = BedrockModelUtils.deriveActualModelId({
      fmModelId: testModel,
      useCrossRegionInference: false,
    });

    expect(modelId).toBe(testModel.modelId);
  });

  test('deriveActualModelId returns prefixed model ID with cross-region inference', () => {
    const modelId = BedrockModelUtils.deriveActualModelId({
      fmModelId: testModel,
      useCrossRegionInference: true,
      crossRegionInferencePrefix: BedrockCrossRegionInferencePrefix.US,
    });

    expect(modelId).toBe(`us.${testModel.modelId}`);
  });

  test('deriveActualModelId uses EU prefix when specified', () => {
    const modelId = BedrockModelUtils.deriveActualModelId({
      fmModelId: testModel,
      useCrossRegionInference: true,
      crossRegionInferencePrefix: BedrockCrossRegionInferencePrefix.EU,
    });

    expect(modelId).toBe(`eu.${testModel.modelId}`);
  });

  test('deriveActualModelId uses default model when not specified', () => {
    const modelId = BedrockModelUtils.deriveActualModelId();

    expect(modelId).toBe(FoundationModelIdentifier.ANTHROPIC_CLAUDE_SONNET_4_20250514_V1_0.modelId);
  });

  test('generateModelIAMPermissions creates policy for foundation model', () => {
    const policy = BedrockModelUtils.generateModelIAMPermissions(stack, {
      fmModelId: testModel,
    });

    const statement = policy.toJSON();
    expect(statement.Effect).toBe('Allow');
    expect(statement.Action).toEqual([
      'bedrock:InvokeModel',
      'bedrock:InvokeModelWithResponseStream',
    ]);
    expect(statement.Resource).toContainEqual(
      `arn:aws:bedrock:*::foundation-model/${testModel.modelId}`,
    );
  });

  test('generateModelIAMPermissions includes inference profile ARN', () => {
    const policy = BedrockModelUtils.generateModelIAMPermissions(stack, {
      fmModelId: testModel,
      useCrossRegionInference: true,
      crossRegionInferencePrefix: BedrockCrossRegionInferencePrefix.US,
    });

    const statement = policy.toJSON();
    expect(statement.Resource).toContainEqual(
      `arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.${testModel.modelId}`,
    );
  });

  test('generateModelIAMPermissions uses default US prefix', () => {
    const policy = BedrockModelUtils.generateModelIAMPermissions(stack);

    const statement = policy.toJSON();
    expect(statement.Resource).toContainEqual(
      expect.stringContaining('inference-profile/us.'),
    );
  });
});
