// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Chain, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { BaseDocumentProcessingProps } from '../base-document-processing';

/**
 * Abstraction to enable different types of source triggers
 * for the intelligent document processing workflow
 */
export interface IAdapter {
  /**
     * Initializes the adapter
     * @param scope Scope to use in relation to the CDK hierarchy
     * @param props The parameters passed to the document processing L3 Construct
     */
  init(scope: Construct, props: BaseDocumentProcessingProps): void;

  /**
     * Create resources that would receive the data and trigger the workflow.
     *
     * Important: resource created should trigger the state machine
     * @param scope Scope to use in relation to the CDK hierarchy
     * @param stateMachine The workflow of the document processor
     * @param props The parameters passed to the document processing L3 Construct
     * @return Resources that are created
     */
  createIngressTrigger(scope: Construct, stateMachine: StateMachine, props: BaseDocumentProcessingProps): Record<string, any>;

  /**
     * Generate IAM statements that can be used by other resources to access the storage
     * @param additionalIAMActions (Optional) list of additional actions in relation
     * to the underlying storage for the adapter. @default empty string array
     * @param narrowActions (Optional) whether the resulting permissions would only
     * be the IAM actions indicated in the `additionalIAMActions` parameter. @default false
     * @return PolicyStatement[] IAM policy statements that would included in the state machine IAM role
     */
  generateAdapterIAMPolicies(additionalIAMActions?: string[], narrowActions?: boolean): PolicyStatement[];

  /**
     * Create the adapter specific handler for failed processing
     * @param scope Scope to use in relation to the CDK hierarchy
     * @return Chain to be added to the state machine to handle failure scenarios
     */
  createFailedChain(scope: Construct): Chain;

  /**
     * Create the adapter specific handler for successful processing
     * @param scope Scope to use in relation to the CDK hierarchy
     * @return Chain to be added to the state machine to handle successful scenarios
     */
  createSuccessChain(scope: Construct): Chain;
}