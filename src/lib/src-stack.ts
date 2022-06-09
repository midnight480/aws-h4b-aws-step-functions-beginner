import { aws_dynamodb, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { DynamoGetItem, DynamoAttributeValue, DynamoUpdateItem, CallAwsService }  from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { Choice, Condition, Fail, JsonPath, Parallel, Pass, StateMachine, Wait, WaitTime } from 'aws-cdk-lib/aws-stepfunctions';
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';


export class SrcStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

  // S3 Bucket
  const s3BucketName = 'h4b-sfn-shibao' ;
  const bucket = new Bucket(this, "Create S3 bucket", {
    bucketName: s3BucketName,
    accessControl: BucketAccessControl.PRIVATE,
    encryption: BucketEncryption.S3_MANAGED,
    versioned: false,
    blockPublicAccess: BlockPublicAccess.BLOCK_ALL ,
    removalPolicy: RemovalPolicy.DESTROY ,
    autoDeleteObjects: true ,
  });

  // DynamoDB
  const articleTable = new aws_dynamodb.Table(this, 'articleTable' , {
      tableName: 'Article' ,
      partitionKey: { name: 'ArticleID', type: aws_dynamodb.AttributeType.STRING },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
  })

  // Get DynamoDB for Step Functions 
  const getDdbItem = new DynamoGetItem(this, 'Get Ddb Item' , {
      key: { ArticleID: DynamoAttributeValue.fromString(JsonPath.stringAt('$.ArticleID')) },
      table: articleTable ,
      consistentRead: false ,
    });

  /*------------------ */

  // Translate Text
  const translateText = new CallAwsService(this, 'TranslateText', {
    service: 'Translate' ,
    action: 'translateText' ,
    // !Note iamAction Needs not match service:action 
    // iamAction: 'translate:TranslateText' ,
    iamResources: ['*'] ,
    parameters: {
      "SourceLanguageCode": "ja" ,
      "TargetLanguageCode": "en",
       "Text.$": "$.Item.Detail.S"
    } ,
    resultPath: '$.Result' ,
  });

  // Update DynamoDB for Translate Text on Step Functions
  const updateDdbItemTranslate = new DynamoUpdateItem(this, 'Update Ddb Item for Traslate' , {
    key: { ArticleID: DynamoAttributeValue.fromString(JsonPath.stringAt('$.Item.ArticleID.S')) },
    table: articleTable ,
    expressionAttributeValues: {
      ':EnglishVersionRef': DynamoAttributeValue.fromString(JsonPath.stringAt('$.Result.TranslatedText')),
    },
    updateExpression: 'SET EnglishVersionRef = :EnglishVersionRef',
  });

  // Translate Tasks
  const translateTasks = translateText
    .next(updateDdbItemTranslate)
  ;

  /*------------------ */

  // Speech-To-Text 
  const speechSynthesis = new CallAwsService(this, 'SpeechSynthesis', {
   service: 'polly' ,
   action: 'startSpeechSynthesisTask' ,
   // iamAction: 'polly:startSpeechSynthesisTask' ,
   iamResources: ['*'] ,
   parameters: {
    "OutputFormat": "mp3",
    "OutputS3BucketName": s3BucketName,
    "Text.$": "$.Item.Detail.S",
    "VoiceId": "Mizuki"
    },
   resultPath: '$.Result' ,
  })

  // Update DynamoDB for Translate Text on Step Functions
  const updateDdbItemSpeech = new DynamoUpdateItem(this, 'Update Ddb Item for Speech' , {
    key: { ArticleID: DynamoAttributeValue.fromString(JsonPath.stringAt('$.Item.ArticleID.S')) },
    table: articleTable ,
    expressionAttributeValues: {
      ':S3URLRef': DynamoAttributeValue.fromString(JsonPath.stringAt('$.Result.SynthesisTask.OutputUri')),
    },
    updateExpression: 'SET S3URLRef = :S3URLRef',
    resultPath: '$.Result.SynthesisTask.OutputUri'
  });

  // Get Speech Task State
  const getSpeechTask = new CallAwsService(this, 'GetSpeechSynthesisTask', {
    service: 'polly' ,
    action: 'getSpeechSynthesisTask' ,
   // !Note iamAction Needs not match service:action 
   // iamAction: 'polly:getSpeechSynthesisTask' ,
    iamResources: ['*'] ,
    parameters: {
      "TaskId.$": "$.Result.SynthesisTask.TaskId"
    } ,
    resultPath: '$.Result' ,
  });

  const wait4task = new Wait(this, 'Wait for Speech Synthesis', {
    time: WaitTime.duration(Duration.seconds(5)),
  });

    /*------------------ */

  const speechtask11 =  speechSynthesis
    .next(getSpeechTask)
    ;

  const speechtask21 = wait4task
    .next(getSpeechTask)
  ;

  const speechtask12 = speechtask11
    .next( new Choice(this, 'Check for Speech Synthesis')
      .when(Condition.stringMatches('$.Result.SynthesisTask.TaskStatus', 'completed'), updateDdbItemSpeech)
      .otherwise( speechtask21 )
   );

  // Speech Tasks
  const speechTasks = speechtask12
    
    /*------------------ */

  // Parallel for Step Functions 
  const parallel = new Parallel(this, 'Parallel')
    .branch( translateTasks )
    .branch( speechTasks )
    ;

   /*------------------ */

   // Error for Step Functions 
  const jobFailed = new Fail(this, 'Job Failed', {
      cause: 'AWS Step Functions Job Failed',
      error: 'DescribeJob returned FAILED',
    });

  /*------------------ */

  // Definition for Step Functions
  const definition = getDdbItem
    .next( new Choice(this, 'Item is present')
        .when(Condition.isPresent('$.Item'), parallel)
        .otherwise(jobFailed)
    );

  /*------------------ */

  // Step Functions
  const simpleStateMachine  =  new StateMachine(this, 'h4b-stateMachine', {
      definition: definition ,
      timeout: Duration.seconds(60)
    });

  // Add IAM Policy for Polly 
    simpleStateMachine.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:PutObject'],
        resources: ['*'],
      })
    );

  }
}
