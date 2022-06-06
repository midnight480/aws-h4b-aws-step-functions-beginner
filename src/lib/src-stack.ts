import { aws_dynamodb, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { DynamoGetItem, DynamoAttributeValue }  from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
// import * as sqs from 'aws-cdk-lib/aws-sqs';


export class SrcStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

  // DynamoDB
  const articleTable = new aws_dynamodb.Table(this, 'articleTable' , {
      tableName: 'Article' ,
      partitionKey: { name: 'articleID', type: aws_dynamodb.AttributeType.STRING },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
  })

  // Get DynamoDB for Step Functions 
  const getDdbItem = new DynamoGetItem(this, 'Get Ddb Item' , {
      key: { articleID: DynamoAttributeValue.fromString('0001') },
      table: articleTable ,
      consistentRead: false ,
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
