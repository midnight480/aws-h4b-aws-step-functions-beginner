import { aws_dynamodb, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { StateMachine, Choice, Condition, Pass, StateMachineType, TaskStateBase } from 'aws-cdk-lib/aws-stepfunctions';
// import * as sqs from 'aws-cdk-lib/aws-sqs';


export class SrcStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

  // DynamoDB
  const articleTable = new aws_dynamodb.Table(this, 'articleTable' , {
      tableName: 'Article' ,
      partitionKey: { name: 'articleId', type: aws_dynamodb.AttributeType.STRING },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
  })

  // Get DynamoDB for Step Functions 
  const getDdbItem = new tasks.DynamoGetItem(this, 'Get Ddb Item' , {
      key: { articleID: tasks.DynamoAttributeValue.fromString('0001') },
      table: articleTable ,
    });
  
  // Defination for Step Functions
  const definition = getDdbItem;

  // Step Functions
  const simpleStateMachine  =  new StateMachine(this, 'h4b-stateMachine', {
      definition: definition ,
      timeout: Duration.seconds(30)
    });

  }
}
