import { aws_dynamodb, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { DynamoGetItem, DynamoAttributeValue, DynamoUpdateItem }  from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { Choice, Condition, Fail, JsonPath, Parallel, Pass, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';


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
      key: { articleID: DynamoAttributeValue.fromString(JsonPath.stringAt('$.ArticleID')) },
      table: articleTable ,
      consistentRead: false ,
      inputPath: '$.ArticleID' ,
    });
  
  // [ToDo]Translate Text

  // Update DynamoDB for Translate Text on Step Functions
  const updateDdbItemTranslate = new DynamoUpdateItem(this, 'Update Ddb Item for Traslate' , {
    key: { articleID: DynamoAttributeValue.fromString(JsonPath.stringAt('$.Item.ArticleID.S')) },
    table: articleTable ,
    inputPath: '$.Item.ArticleID.S' ,
    expressionAttributeValues: {
      ':EnglishVersionRef': DynamoAttributeValue.numberFromString(JsonPath.stringAt('$.Result.TranslatedText')),
    },
    updateExpression: 'SET EnglishVersionRef = :EnglishVersionRef',
    outputPath: '$.Result.TranslatedText'
  });

  // [ToDo]Speech-To-Text 

  // Update DynamoDB for Translate Text on Step Functions
  const updateDdbItemSpeech = new DynamoUpdateItem(this, 'Update Ddb Item for Speech' , {
    key: { articleID: DynamoAttributeValue.fromString(JsonPath.stringAt('$.Item.ArticleID.S')) },
    table: articleTable ,
    inputPath: '$.Item.ArticleID.S' ,
    expressionAttributeValues: {
      ':S3URL': DynamoAttributeValue.numberFromString(JsonPath.stringAt('$.Result.SynthesisTask.OutputUri')),
    },
    updateExpression: 'SET S3URL = :S3URLRef',
    outputPath: '$.Result.SynthesisTask.OutputUri'
  });

  // Parallel for Step Functions 
  const parallel = new Parallel(this, 'Parallel')
    .branch( updateDdbItemTranslate )
    .branch( updateDdbItemSpeech )
    ;

  // Error for Step Functions 
  const jobFailed = new Fail(this, 'Job Failed', {
      cause: 'AWS Step Functions Job Failed',
      error: 'DescribeJob returned FAILED',
    });

  // Definition for Step Functions
  const definition = getDdbItem
    .next( new Choice(this, 'Item is present')
        .when(Condition.isPresent('$.Item'), parallel)
        .otherwise(jobFailed)
    );

  // Step Functions
  const simpleStateMachine  =  new StateMachine(this, 'h4b-stateMachine', {
      definition: definition ,
      timeout: Duration.seconds(30)
    });

  }
}
